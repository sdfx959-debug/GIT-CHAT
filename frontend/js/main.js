let currentUser = null;
let activeContact = null; // Complete user object of the current chat
let typingTimeout = null;
let currentTab = 'recent-chats'; // or 'contacts'

document.addEventListener('DOMContentLoaded', async () => {
  UI.initTheme();
  
  // Check auth
  const token = API.getToken();
  if(!token) {
    UI.switchView('auth');
    return;
  }

  try {
    currentUser = await API.getMe();
    initApp();
  } catch (e) {
    // Cannot fetch user, token invalid
    API.setToken(null);
    UI.switchView('auth');
    return;
  }
});

function initApp() {
  UI.switchView('app');
  
  // Set current user info
  document.getElementById('my-profile-img').src = currentUser.profileImage;
  document.getElementById('my-username').textContent = currentUser.username;

  // Init Sockets
  socketClient.connect(API.getToken(), currentUser.id);

  // Setup UI Even Listeners
  setupEventListeners();

  // Load Initial Sidebar Data
  loadSidebar(currentTab);
  
  // Listen for socket events
  socketClient.callbacks.onReceiveMessage = handleReceiveMessage;
  socketClient.callbacks.onUserTyping = handleUserTyping;
  socketClient.callbacks.onUserStatusChanged = handleStatusChange;
  socketClient.callbacks.onMessagesSeen = handleMessagesSeen;
}

function setupEventListeners() {
  // Theme Toggle
  document.getElementById('theme-toggle').addEventListener('click', () => {
    UI.toggleTheme();
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    socketClient.disconnect();
    API.setToken(null);
    API.setUser(null);
    window.location.reload();
  });

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentTab = e.target.getAttribute('data-tab');
      loadSidebar(currentTab);
    });
  });

  // Search Users
  const searchInput = document.getElementById('user-search');
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    if(query.length === 0) {
      loadSidebar(currentTab);
      return;
    }
    
    searchTimeout = setTimeout(async () => {
      try {
        const results = await API.searchUsers(query);
        renderUserList(results, true);
      } catch (err) {
        console.error(err);
      }
    }, 500);
  });

  // Message Sending
  const messageForm = document.getElementById('message-form');
  const messageInput = document.getElementById('message-input');
  
  messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if(!text || !activeContact) return;

    // Speculative insertion
    const tempMsg = {
      id: 'temp-' + Date.now(),
      senderId: currentUser.id,
      receiverId: activeContact.id,
      text,
      timestamp: new Date().toISOString(),
      status: 'sent'
    };
    renderMessage(tempMsg, true);
    scrollToBottom();

    socketClient.sendMessage(activeContact.id, text);
    messageInput.value = '';
    
    // Refresh sidebar to jump chat to top if on recent
    if(currentTab === 'recent-chats') loadSidebar('recent-chats');
  });

  messageInput.addEventListener('input', () => {
    if(activeContact) {
      socketClient.emitTyping(activeContact.id);
    }
  });

  // Mobile back button
  document.getElementById('back-to-sidebar').addEventListener('click', () => {
    document.querySelector('.chat-area').classList.remove('active');
  });
}

// Sidebars
async function loadSidebar(tab) {
  try {
    const listContainer = document.getElementById('sidebar-lists');
    listContainer.innerHTML = '<div class="text-center text-muted p-3">Loading...</div>';

    if (tab === 'recent-chats') {
      const chats = await API.getRecentChats();
      // chats is { user: {}, lastMessage: {} }
      const usersWithLastMsg = chats.map(c => {
        return {
          ...c.user,
          lastMessageText: c.lastMessage.text
        }
      });
      renderUserList(usersWithLastMsg, false, true);
    } else {
      const contacts = await API.getContacts();
      renderUserList(contacts, false);
    }
  } catch (err) {
    console.error(err);
  }
}

function renderUserList(users, isSearch = false, showLastMessage = false) {
  const listContainer = document.getElementById('sidebar-lists');
  listContainer.innerHTML = '';

  if (users.length === 0) {
    listContainer.innerHTML = `<div class="p-3 text-muted" style="text-align: center;">${isSearch ? 'No users found' : 'No items'}</div>`;
    return;
  }

  users.forEach(user => {
    const isActive = activeContact && activeContact.id === user.id;
    const div = document.createElement('div');
    div.className = `user-item ${isActive ? 'active' : ''}`;
    
    const statusDot = user.status === 'online' ? '<span class="status-indicator online meta-dot"></span>' : '';
    const metaText = showLastMessage && user.lastMessageText ? user.lastMessageText : (isSearch ? user.email : (user.status === 'online' ? 'Online' : 'Offline'));

    div.innerHTML = `
      <img src="${user.profileImage}" class="avatar-sm">
      <div class="user-item-info">
        <div class="user-item-name">
          ${user.username}
          ${user.status === 'online' && !showLastMessage ? statusDot : ''}
        </div>
        <div class="user-item-meta">${metaText}</div>
      </div>
    `;

    div.addEventListener('click', () => openChat(user));
    listContainer.appendChild(div);
  });
}

// Active Chat interactions
async function openChat(user) {
  activeContact = user;
  
  // Highlight active user in sidebar
  document.querySelectorAll('.user-item').forEach(el => el.classList.remove('active'));
  // Can be complex to find exact DOM element, we rely on re-renders for highlighting mostly, but a quick setup works here.

  // Fetch API for adding to contacts if we searched for them implicitly
  const searchInput = document.getElementById('user-search');
  if(searchInput.value) {
    await API.addContact(user.id);
    searchInput.value = '';
    loadSidebar(currentTab);
  }

  // Mobile slide
  if(window.innerWidth <= 768) {
    document.querySelector('.chat-area').classList.add('active');
  }

  document.getElementById('chat-empty-state').classList.add('hidden');
  document.getElementById('chat-window').classList.remove('hidden');

  // Update Header
  document.getElementById('active-chat-img').src = user.profileImage;
  document.getElementById('active-chat-name').textContent = user.username;
  if(user.status === 'online') {
    document.getElementById('active-chat-status').textContent = 'Online';
    document.getElementById('active-chat-status-dot').classList.add('online');
  } else {
    document.getElementById('active-chat-status').textContent = 'Offline';
    document.getElementById('active-chat-status-dot').classList.remove('online');
  }

  const listContainer = document.getElementById('messages-list');
  listContainer.innerHTML = '<div class="text-center p-3 text-muted">Loading messages...</div>';

  try {
    const history = await API.getChatHistory(user.id);
    listContainer.innerHTML = '';
    
    let unreadIds = [];
    history.forEach(msg => {
      renderMessage(msg);
      if(msg.receiverId === currentUser.id && msg.status !== 'seen') {
        unreadIds.push(msg.id);
      }
    });
    scrollToBottom();

    // Mark as read
    if(unreadIds.length > 0) {
      socketClient.markAsSeen(unreadIds, activeContact.id);
    }

  } catch (err) {
    listContainer.innerHTML = '<div class="text-center p-3 text-muted">Error loading messages</div>';
  }
}

function renderMessage(msg, append = true) {
  const container = document.getElementById('messages-list');
  const isMine = msg.senderId === currentUser.id;
  
  const div = document.createElement('div');
  div.className = `message ${isMine ? 'sent' : 'received'}`;
  div.id = `msg-${msg.id}`;
  
  let statusIcon = '';
  if(isMine) {
    // checkmarks
    const isSeen = msg.status === 'seen';
    statusIcon = `<span class="msg-status ${isSeen ? 'seen' : ''} ms-1">
      ${isSeen ? 
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L7 17l-5-5"></path><path d="M22 10l-4 4"></path></svg>` : 
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`}
    </span>`;
  }

  div.innerHTML = `
    <div>${escapeHTML(msg.text)}</div>
    <div class="message-time">
      ${UI.formatTime(msg.timestamp)}
      ${statusIcon}
    </div>
  `;

  if(append) {
    container.appendChild(div);
  } else {
    container.prepend(div);
  }
}

function scrollToBottom() {
  const container = document.getElementById('messages-list');
  container.scrollTop = container.scrollHeight;
}

// Socket Handlers
function handleReceiveMessage(msg) {
  if (activeContact && msg.senderId === activeContact.id) {
    renderMessage(msg);
    scrollToBottom();
    // mark seen
    socketClient.markAsSeen([msg.id], activeContact.id);
  } else {
    // Could display a notification badge on sidebar
    UI.showNotification('New message received');
  }
  if(currentTab === 'recent-chats') loadSidebar('recent-chats');
}

function handleUserTyping(senderId) {
  if (activeContact && senderId === activeContact.id) {
    const typingIndicator = document.getElementById('typing-indicator');
    typingIndicator.classList.remove('hidden');
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      typingIndicator.classList.add('hidden');
    }, 2000);
  }
}

function handleStatusChange(data) {
  const { userId, status } = data;
  
  if (activeContact && userId === activeContact.id) {
    activeContact.status = status;
    if(status === 'online') {
      document.getElementById('active-chat-status').textContent = 'Online';
      document.getElementById('active-chat-status-dot').classList.add('online');
    } else {
      document.getElementById('active-chat-status').textContent = 'Offline';
      document.getElementById('active-chat-status-dot').classList.remove('online');
    }
  }

  // Very naive approach: refresh entire sidebar to update statuses if open
  loadSidebar(currentTab);
}

function handleMessagesSeen(data) {
  const { messageIds, readerId } = data;
  if(activeContact && activeContact.id === readerId) {
    messageIds.forEach(id => {
      const el = document.getElementById(`msg-${id}`);
      if(el) {
        const svgHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L7 17l-5-5"></path><path d="M22 10l-4 4"></path></svg>`;
        const statusSpan = el.querySelector('.msg-status');
        if (statusSpan) {
           statusSpan.classList.add('seen');
           statusSpan.innerHTML = svgHTML;
        }
      }
    });
  }
}

// Utility to prevent XSS
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag])
  );
}
