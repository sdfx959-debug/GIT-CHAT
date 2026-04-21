document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const goRegBtn = document.getElementById('go-to-register');
  const goLogBtn = document.getElementById('go-to-login');

  // Toggle Forms
  goRegBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.remove('active');
    setTimeout(() => {
      loginForm.classList.add('hidden');
      registerForm.classList.remove('hidden');
      setTimeout(() => registerForm.classList.add('active'), 10);
    }, 300);
  });

  goLogBtn.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.remove('active');
    setTimeout(() => {
      registerForm.classList.add('hidden');
      loginForm.classList.remove('hidden');
      setTimeout(() => loginForm.classList.add('active'), 10);
    }, 300);
  });

  // Login handler
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    
    try {
      const btn = loginForm.querySelector('button');
      btn.textContent = 'Loading...';
      btn.disabled = true;
      
      await API.login(email, pass);
      window.location.reload(); // App will handle view switch based on token presence
    } catch (err) {
      UI.showNotification(err.message, 'error');
      const btn = loginForm.querySelector('button');
      btn.textContent = 'Sign In';
      btn.disabled = false;
    }
  });

  // Register handler
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const pass = document.getElementById('register-password').value;
    
    try {
      const btn = registerForm.querySelector('button');
      btn.textContent = 'Loading...';
      btn.disabled = true;

      await API.register(username, email, pass);
      window.location.reload();
    } catch (err) {
      UI.showNotification(err.message, 'error');
      const btn = registerForm.querySelector('button');
      btn.textContent = 'Create Account';
      btn.disabled = false;
    }
  });
});
