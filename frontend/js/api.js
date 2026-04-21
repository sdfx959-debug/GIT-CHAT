const API_URL = '/api';

const API = {
  getToken() {
    return localStorage.getItem('messenger_token');
  },
  
  setToken(token) {
    if (token) localStorage.setItem('messenger_token', token);
    else localStorage.removeItem('messenger_token');
  },

  getUser() {
    const u = localStorage.getItem('messenger_user');
    return u ? JSON.parse(u) : null;
  },

  setUser(user) {
    if (user) localStorage.setItem('messenger_user', JSON.stringify(user));
    else localStorage.removeItem('messenger_user');
  },

  async request(endpoint, method = 'GET', body = null) {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        this.setToken(null);
        this.setUser(null);
        window.location.reload();
      }
      throw new Error(data.error || 'Something went wrong');
    }

    return data;
  },

  // Auth
  async login(email, password) {
    const data = await this.request('/auth/login', 'POST', { email, password });
    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  },

  async register(username, email, password) {
    const data = await this.request('/auth/register', 'POST', { username, email, password });
    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  },

  // Users
  async getMe() {
    return this.request('/users/me');
  },
  
  async searchUsers(query) {
    return this.request(`/users/search?q=${encodeURIComponent(query)}`);
  },

  async getContacts() {
    return this.request('/users/contacts');
  },
  
  async addContact(contactId) {
    return this.request('/users/contacts', 'POST', { contactId });
  },

  // Messages
  async getRecentChats() {
    return this.request('/messages');
  },

  async getChatHistory(contactId) {
    return this.request(`/messages/${contactId}`);
  }
};
