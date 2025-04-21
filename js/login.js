// js/login.js

document.addEventListener('DOMContentLoaded', () => {
    // Remove any stale login info
    localStorage.removeItem('user');
  
    const form     = document.getElementById('loginForm');
    const errorDiv = document.getElementById('error');
    const errMsg   = document.getElementById('error-message');
  
    form.addEventListener('submit', async e => {
      e.preventDefault();
      errorDiv.style.display = 'none';
      errMsg.textContent     = '';
  
      const role     = form.role.value;
      const username = form.username.value.trim();
      const password = form.password.value;
  
      if (!role) {
        errMsg.textContent = 'Please select a role';
        return errorDiv.style.display = 'block';
      }
  
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify({ role, username, password })
        });
        const data = await res.json();
        console.log('Login response:', res.status, data);
  
        if (!res.ok) {
          errMsg.textContent = data.message || 'Login failed';
          return errorDiv.style.display = 'block';
        }
  
        // Save the user object as returned by the server
        localStorage.setItem('user', JSON.stringify(data.user));
  
        // Redirect based on actual server role
        if (data.user.role === 'tenant') {
          window.location.href = 'tenant_dashboard.html';
        } else if (data.user.role === 'owner') {
          window.location.href = 'owner_dashboard.html';
        } else {
          // unexpected role—back to login
          alert('Unknown role, please try again.');
          window.location.href = 'login.html';
        }
  
      } catch (err) {
        console.error('Fetch error:', err);
        errMsg.textContent     = 'Server error: ' + err.message;
        errorDiv.style.display = 'block';
      }
    });
  });