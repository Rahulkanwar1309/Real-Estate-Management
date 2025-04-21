// js/common.js
document.addEventListener('DOMContentLoaded', () => {
    // Display username from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const usernameDisplay = document.getElementById('username-display');
    
    if (usernameDisplay && user.username) {
      usernameDisplay.textContent = user.username;
    }
    
    // Setup logout functionality
    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('user');
        window.location.href = 'login.html';
      });
    }
  });