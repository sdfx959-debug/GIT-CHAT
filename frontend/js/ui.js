const UI = {
  showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    const note = document.createElement('div');
    note.className = `notification ${type}`;
    note.textContent = message;
    
    container.appendChild(note);
    
    setTimeout(() => {
      note.style.opacity = '0';
      note.style.transform = 'translateX(100%)';
      note.style.transition = 'all 0.3s ease';
      setTimeout(() => note.remove(), 300);
    }, 3000);
  },

  toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('messenger_theme', newTheme);
    
    document.querySelector('.sun-icon').classList.toggle('hidden', newTheme === 'light');
    document.querySelector('.moon-icon').classList.toggle('hidden', newTheme === 'dark');
  },

  initTheme() {
    const savedTheme = localStorage.getItem('messenger_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    if(savedTheme === 'light') {
      document.querySelector('.sun-icon').classList.add('hidden');
      document.querySelector('.moon-icon').classList.remove('hidden');
    }
  },

  switchView(view) {
    document.getElementById('auth-view').classList.add('hidden');
    document.getElementById('app-view').classList.add('hidden');
    
    document.getElementById(`${view}-view`).classList.remove('hidden');
  },
  
  formatTime(isoString) {
    const date = new Date(isoString);
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    minutes = minutes < 10 ? '0'+minutes : minutes;
    return `${hours}:${minutes} ${ampm}`;
  }
};
