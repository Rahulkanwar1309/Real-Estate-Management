// js/create_listing.js
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('createListingForm');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
  
    if (!user.id) {
      alert('Please log in first.');
      return location.href = 'login.html';
    }
  
    form.addEventListener('submit', async e => {
      e.preventDefault();
  
      const payload = {
        owner_id:   user.id,
        title:      form.title.value.trim(),
        address:    form.address.value.trim(),
        zipcode:     form.zipcode.value.trim(),
        price:      parseFloat(form.price.value),
        bedrooms:   parseInt(form.bedrooms.value),
        bathrooms:  parseInt(form.bathrooms.value),
        description: form.description.value.trim()
      };
  
      try {
        const res = await fetch('/api/listings', {
          method: 'POST',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          alert('Listing created!');
          location.href = 'owner_listing.html';
        } else {
          const err = await res.json();
          alert('Error: ' + (err.message || 'Could not create'));
        }
      } catch (err) {
        console.error(err);
        alert('Server error.');
      }
    });
  });