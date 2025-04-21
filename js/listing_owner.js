let mine = [];
let filteredListings = [];

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('listings-container');
    const searchInput = document.getElementById('searchListings');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!user.id || user.role !== 'owner') {
      alert('Owners only');
      return location.href = 'login.html';
    }

    // Function to render listings
    function renderListings(listings) {
      if (listings.length === 0) {
        container.innerHTML = '<p>No listings found.</p>';
      } else {
        container.innerHTML = listings.map(l => `
          <div class="property-card" data-id="${l.id}">
            <div class="property-info">
              <h4>${l.title}</h4>
              <p><i class="fas fa-map-marker-alt"></i> ${l.address}</p>
              <p><i class="fas fa-bed"></i> ${l.bedrooms} bed · 
                 <i class="fas fa-bath"></i> ${l.bathrooms} bath</p>
              <p><strong>$${l.price}/mo</strong></p>
            </div>
            <div class="card-actions">
              <button class="btn btn-sm edit-btn" data-id="${l.id}">Edit</button>
              <button class="btn btn-sm delete-btn" data-id="${l.id}">Delete</button>
            </div>
          </div>
        `).join('');
      }

      // Attach delete handlers
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          if (!confirm('Delete this listing?')) return;
          try {
            const res = await fetch(`/api/listings/${id}`, { method: 'DELETE' });
            if (res.ok) {
              btn.closest('.property-card').remove();
              // Also remove from our arrays
              mine = mine.filter(l => l.id != id);
              filteredListings = filteredListings.filter(l => l.id != id);
            } else {
              const err = await res.json();
              alert('Error deleting listing: ' + (err.msg || err.message));
            }
          } catch (e) {
            console.error(e);
            alert('Error deleting listing.');
          }
        });
      });

      // Attach edit handlers
      document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const listing = mine.find(l => l.id == id);
          const newTitle = prompt('New title:', listing.title);
          if (newTitle === null) return;
          const newAddress = prompt('New address:', listing.address);
          if (newAddress === null) return;
          const newPrice = prompt('New price:', listing.price);
          if (newPrice === null) return;
          const payload = { title: newTitle, address: newAddress, price: parseFloat(newPrice) };
          try {
            const res = await fetch(`/api/listings/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            if (res.ok) {
              alert('Listing updated. Reloading...');
              location.reload();
            } else {
              const err = await res.json();
              alert('Error updating listing: ' + (err.msg || err.message));
            }
          } catch (e) {
            console.error(e);
            alert('Error updating listing.');
          }
        });
      });
    }

    // Function to filter listings based on search query
    function filterListings(query) {
      if (!query) {
        filteredListings = [...mine];
        return renderListings(filteredListings);
      }

      query = query.toLowerCase();
      filteredListings = mine.filter(listing => 
        listing.title.toLowerCase().includes(query) || 
        listing.address.toLowerCase().includes(query) ||
        listing.description?.toLowerCase().includes(query)
      );
      
      renderListings(filteredListings);
    }

    // Add event listener for search input
    searchInput.addEventListener('input', () => {
      filterListings(searchInput.value.trim());
    });

    try {
      const res = await fetch('/api/listings');
      const all = await res.json();
      mine = all.filter(l => l.owner_id === user.id);
      
      // Initialize filtered listings
      filteredListings = [...mine];
      renderListings(filteredListings);
      
    } catch (err) {
      console.error(err);
      container.innerHTML = '<p>Error loading listings.</p>';
    }
});