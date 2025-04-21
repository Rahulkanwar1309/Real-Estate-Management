// js/register.js

document.addEventListener('DOMContentLoaded', () => {
    console.log('Register script loaded');
  
    const form     = document.getElementById('registerForm');
    const errorDiv = document.getElementById('error');
    const errMsg   = document.getElementById('error-message');
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('Register form submitted');
  
      // Hide previous error
      errorDiv.style.display = 'none';
      errMsg.textContent     = '';
  
      // Collect values
      const role     = form.role.value;
      const username = form.username.value.trim();
      const email    = form.email.value.trim();
      const password = form.password.value;
  
      console.log({ role, username, email });
  
      // Validation
      if (!role) {
        errMsg.textContent = 'Please select a role';
        return errorDiv.style.display = 'block';
      }
      if (!username || !email || !password) {
        errMsg.textContent = 'All fields are required';
        return errorDiv.style.display = 'block';
      }
  
      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, username, email, password })
        });
  
        console.log('Fetch status:', response.status, response.statusText);
  
        // Read raw text (in case it's HTML or error page)
        const raw = await response.text();
        console.log('Raw server response:', raw);
  
        let data;
        try {
          data = JSON.parse(raw);
          console.log('Parsed JSON response:', data);
        } catch (parseErr) {
          console.error('JSON parse error:', parseErr);
          errMsg.textContent = 'Invalid server response: ' + raw;
          return errorDiv.style.display = 'block';
        }
  
        if (!response.ok) {
          errMsg.textContent = data.msg || data.message || 'Registration failed';
          errorDiv.style.display = 'block';
        } else {
          alert('Registration successful! Redirecting to login...');
          window.location.href = 'login.html';
        }
      } catch (err) {
        console.error('Fetch error:', err);
        errMsg.textContent     = 'Server error: ' + err.message;
        errorDiv.style.display = 'block';
      }
    });
  });