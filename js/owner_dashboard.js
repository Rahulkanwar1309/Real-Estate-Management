document.addEventListener('DOMContentLoaded', async () => {

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user.id || user.role !== 'owner') {
    alert('Owners only');
    return location.href = 'login.html';
  }

  // Display current date
  const dateEl = document.getElementById('current-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  try {
    // Fetch all listings, inquiries, and viewings
    const [lstRes, inqRes, vwRes] = await Promise.all([
      fetch('/api/listings'),
      fetch('/api/inquiries'),
      fetch('/api/viewings')
    ]);
    
    // Check if any of the responses failed
    if (!lstRes.ok || !inqRes.ok || !vwRes.ok) {
      throw new Error('One or more API requests failed');
    }
    
    const [allL, allI, allV] = await Promise.all([
      lstRes.json(), inqRes.json(), vwRes.json()
    ]);

    console.log('All listings:', allL);
    console.log('All inquiries:', allI);
    console.log('All viewings:', allV);
    console.log('Current user ID:', user.id);

    // Filter to this owner's data
    const myListings = allL.filter(l => l.owner_id === user.id);
    const myInquiries = allI.filter(i => myListings.some(l => l.id === i.listing_id));
    const myViewings = allV.filter(v => myListings.some(l => l.id === v.listing_id));

    console.log('My listings:', myListings);
    console.log('My inquiries:', myInquiries);
    console.log('My viewings:', myViewings);

    // Update summary counts
    document.getElementById('listings-count').textContent = myListings.length;
    document.getElementById('inquiries-count').textContent = myInquiries.length;
    
    // Show alert if more than 5 inquiries
    const alertEl = document.getElementById('inquiry-alert');
    if (alertEl) {
      alertEl.style.display = myInquiries.length > 5 ? 'block' : 'none';
    }
    
    // Only update viewings count if the element exists
    const viewingsCount = document.getElementById('viewings-count');
    if (viewingsCount) {
      viewingsCount.textContent = myViewings.length;
    }

    // Inject recent listings (up to 3)
    const recentListingsEl = document.getElementById('recent-listings');
    if (recentListingsEl) {
      if (myListings.length > 0) {
        recentListingsEl.innerHTML = myListings
          .slice(0, 3)
          .map(l => `
            <div class="listing-mini-item">
              <img src="/api/placeholder/100/100" alt="${l.title}" class="listing-mini-image">
              <div class="listing-mini-details">
                <h4>${l.title}</h4>
                <p><i class="fas fa-map-marker-alt"></i> ${l.address}</p>
                <p>
                  <i class="fas fa-bed"></i> ${l.bedrooms} bed ·
                  <i class="fas fa-bath"></i> ${l.bathrooms} bath ·
                  <strong>$${l.price}/mo</strong>
                </p>
                <span class="status-badge available">Available</span>
              </div>
            </div>
          `).join('');
      } else {
        recentListingsEl.innerHTML = '<p>No listings yet. <a href="create_listing.html">Create your first listing</a>.</p>';
      }
    }

    // Inject recent inquiries (up to 3)
    const recentInquiriesEl = document.getElementById('recent-inquiries');
    if (recentInquiriesEl) {
      if (myInquiries.length > 0) {
        recentInquiriesEl.innerHTML = myInquiries
          .slice(0, 3)
          .map(i => {
            const L = myListings.find(l => l.id === i.listing_id) || {};
            return `
              <div class="inquiry-mini-item">
                <div class="inquiry-mini-details">
                  <h4>From: ${i.tenant_name || 'Tenant #' + i.tenant_id}</h4>
                  <p><strong>Property:</strong> ${L.title || 'Unknown'}</p>
                  <p><strong>Sent:</strong> ${new Date(i.sent_at).toLocaleString()}</p>
                  <span class="status-badge ${i.status}">${i.status}</span>
                </div>
              </div>
            `;
          }).join('');
      } else {
        recentInquiriesEl.innerHTML = '<p>No inquiries yet.</p>';
      }
    }
  } catch (err) {
    console.error('Dashboard load error:', err);
    // Show a fallback message if needed
    document.querySelectorAll('#recent-listings, #recent-inquiries')
      .forEach(el => { 
        if (el) el.innerHTML = '<p>Error loading data: ' + err.message + '</p>'; 
      });
  }
});