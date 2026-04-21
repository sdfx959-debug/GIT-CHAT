class SocketClient {
  constructor() {
    this.socket = null;
    this.userId = null;
    this.callbacks = {
      onReceiveMessage: null,
      onUserStatusChanged: null,
      onUserTyping: null,
      onMessagesSeen: null
    };
  }

  connect(token, userId) {
    this.userId = userId;
    this.socket = io({
      auth: { token }
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    this.socket.on('receive_message', (msg) => {
      if(this.callbacks.onReceiveMessage) this.callbacks.onReceiveMessage(msg);
      
      // Send seen receipt if chat is open in main process
      // Or just standard delivery receipt here
    });

    this.socket.on('user_status_changed', (data) => {
      if(this.callbacks.onUserStatusChanged) this.callbacks.onUserStatusChanged(data);
    });

    this.socket.on('user_typing', (data) => {
      if(this.callbacks.onUserTyping) this.callbacks.onUserTyping(data.senderId);
    });

    this.socket.on('messages_seen_update', (data) => {
      if(this.callbacks.onMessagesSeen) this.callbacks.onMessagesSeen(data);
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket connect error:', err.message);
    });
  }

  sendMessage(receiverId, text) {
    if(!this.socket) return;
    this.socket.emit('send_message', { receiverId, text });
  }

  emitTyping(receiverId) {
    if(!this.socket) return;
    this.socket.emit('typing', { receiverId });
  }

  markAsSeen(messageIds, senderId) {
    if(!this.socket || messageIds.length === 0) return;
    this.socket.emit('message_seen', { messageIds, senderId });
  }

  disconnect() {
    if(this.socket) this.socket.disconnect();
  }
}

const socketClient = new SocketClient();
