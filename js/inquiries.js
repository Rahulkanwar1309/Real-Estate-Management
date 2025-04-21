// js/inquiries.js

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('inquiries-container');
  const user      = JSON.parse(localStorage.getItem('user') || '{}');

  // Redirect to login if not authenticated
  if (!user.id) {
    return location.href = 'login.html';
  }

  try {
    // Fetch inquiries and listings
    const [inqRes, lstRes] = await Promise.all([
      fetch('/api/inquiries'),
      fetch('/api/listings')
    ]);
    const inquiries = await inqRes.json();
    const listings  = await lstRes.json();

    // Filter inquiries for this owner
    const myListings = listings.filter(l => l.owner_id === user.id);
    const myInquiries = inquiries.filter(i =>
      myListings.some(l => l.id === i.listing_id)
    );

    if (myInquiries.length === 0) {
      container.innerHTML = '<p>No inquiries to show.</p>';
      return;
    }

    // Render inquiry cards
    container.innerHTML = myInquiries.map(i => {
      const L = listings.find(l => l.id === i.listing_id) || {};
      return `
        <div class="request-card" data-id="${i.id}">
          <h4>${L.title || 'Unknown property'}</h4>
          <p><strong>From:</strong> ${i.tenant_name}</p>
          <p>${i.message}</p>
          <span class="status-badge ${i.status}">${i.status}</span>
          <button class="btn btn-sm delete-btn" data-id="${i.id}">Delete</button>
        </div>
      `;
    }).join('');

    // Attach delete handlers
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this inquiry?')) return;
        const id = btn.dataset.id;
        try {
          const res = await fetch(`/api/inquiries/${id}`, { method: 'DELETE' });
          if (res.ok) {
            btn.closest('.request-card').remove();
          } else {
            const err = await res.json();
            alert('Error: ' + (err.msg || err.message));
          }
        } catch (e) {
          console.error(e);
          alert('Error deleting inquiry.');
        }
      });
    });
  } catch (err) {
    console.error('Error loading inquiries:', err);
    container.innerHTML = '<p>Error loading inquiries.</p>';
  }
});
