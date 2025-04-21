// js/tenant_dashboard.js
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('properties-container');
  const searchInput = document.getElementById('searchInput');
  const priceFilter = document.getElementById('priceFilter');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const modal = document.getElementById('propertyModal');
  const propertyDetails = document.getElementById('propertyDetails');
  const closeModal = document.querySelector('.close-modal');
  
  // Variable to store all properties
  let allProperties = [];
  // Variable to store filtered properties
  let filteredProperties = [];
  // Get liked properties from localStorage
  let likedProperties = JSON.parse(localStorage.getItem('likedProperties') || '[]');

  // Close modal when clicking the X
  if (closeModal) {
    closeModal.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }

  // Close modal when clicking outside the content
  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });

  if (!user.id || user.role !== 'tenant') {
    alert('Tenants only');
    return location.href = 'login.html';
  }

  // Function to check if a property is already liked
  function isPropertyLiked(propertyId) {
    return likedProperties.some(p => p.id == propertyId);
  }

  // Function to toggle like status of a property
  function toggleLikeProperty(property) {
    const propertyId = property.id;
    
    if (isPropertyLiked(propertyId)) {
      // Remove from liked properties
      likedProperties = likedProperties.filter(p => p.id != propertyId);
      alert('Property removed from your liked properties.');
    } else {
      // Add to liked properties
      likedProperties.push(property);
      alert('Property added to your liked properties! You can view it later in the Viewings tab.');
    }
    
    // Save updated liked properties to localStorage
    localStorage.setItem('likedProperties', JSON.stringify(likedProperties));
    
    // Update the like button in the modal
    const likeBtn = document.querySelector(`.like-property-btn[data-id="${propertyId}"]`);
    if (likeBtn) {
      updateLikeButton(likeBtn, propertyId);
    }
    
    // Refresh the display to show saved badges
    renderProperties(filteredProperties);
  }

  // Function to update the like button appearance
  function updateLikeButton(button, propertyId) {
    if (isPropertyLiked(propertyId)) {
      button.innerHTML = '<i class="fas fa-heart"></i> Saved';
      button.classList.add('liked');
    } else {
      button.innerHTML = '<i class="far fa-heart"></i> Like Property';
      button.classList.remove('liked');
    }
  }

  // Function to render properties based on current filters
  function renderProperties(properties) {
    if (properties.length === 0) {
      container.innerHTML = '<p>No properties found matching your search criteria.</p>';
      return;
    }

    container.innerHTML = properties.map(l => `
      <div class="property-card" data-id="${l.id}">
        <div class="property-info">
          <h4>${l.title}</h4>
          <p><i class="fas fa-map-marker-alt"></i> ${l.address}</p>
          <p><strong>$${l.price}/mo</strong></p>
          <p><i class="fas fa-bed"></i> ${l.bedrooms} bed · 
             <i class="fas fa-bath"></i> ${l.bathrooms} bath</p>
          <div class="card-actions">
            <button data-id="${l.id}" class="btn btn-sm inquire-btn">Inquire</button>
            <button data-id="${l.id}" class="btn btn-sm view-details-btn">View Details</button>
          </div>
          ${isPropertyLiked(l.id) ? '<span class="liked-badge"><i class="fas fa-heart"></i> Saved</span>' : ''}
        </div>
      </div>
    `).join('');

    // Add event listeners to view details buttons
    document.querySelectorAll('.view-details-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event bubbling
        const propertyId = btn.dataset.id;
        const property = allProperties.find(p => p.id == propertyId);
        if (property) {
          showPropertyDetails(property);
        }
      });
    });

    // Make property cards clickable to show details
    document.querySelectorAll('.property-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Don't trigger if buttons were clicked
        if (e.target.classList.contains('inquire-btn') || 
            e.target.classList.contains('view-details-btn') ||
            e.target.closest('.inquire-btn') ||
            e.target.closest('.view-details-btn')) {
          return;
        }
        
        const propertyId = card.dataset.id;
        const property = allProperties.find(p => p.id == propertyId);
        if (property) {
          showPropertyDetails(property);
        }
      });
    });

    // Set up inquire buttons
    document.querySelectorAll('.inquire-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent event bubbling
        const listing_id = btn.dataset.id;

        // 1) Prompt for tenant's email
        const email = prompt('Please enter your email so the owner can follow up:');
        if (!email) {
          alert('Email is required to send an inquiry.');
          return;
        }

        // 2) Prompt for optional note
        const note = prompt('Enter a message for the owner (optional):', '');
        const message = `Email: ${email}` + (note ? `\nMessage: ${note}` : '');

        try {
          const resp = await fetch('/api/inquiries', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ listing_id, tenant_id: user.id, message })
          });

          if (resp.ok) {
            alert('Inquiry sent! The owner will reach out via email.');
          } else {
            const err = await resp.json();
            alert('Error: ' + (err.message || err.msg || 'Unable to send inquiry'));
          }
        } catch (e) {
          console.error(e);
          alert('Error sending inquiry.');
        }
      });
    });
  }

  // Function to filter properties based on search and price range
  function filterProperties() {
    const searchQuery = searchInput.value.trim().toLowerCase();
    const priceRange = priceFilter.value;
    
    // Filter based on search query and price range
    filteredProperties = allProperties.filter(property => {
      // Check if property matches search query
      const matchesSearch = 
        !searchQuery || 
        property.title.toLowerCase().includes(searchQuery) ||
        property.address.toLowerCase().includes(searchQuery) ||
        (property.description && property.description.toLowerCase().includes(searchQuery)) ||
        (property.zipcode && property.zipcode.toLowerCase().includes(searchQuery));
      
      // Check if property matches price range
      let matchesPrice = true;
      if (priceRange) {
        const price = parseFloat(property.price);
        
        if (priceRange === '0-999') {
          matchesPrice = price >= 0 && price <= 999;
        } else if (priceRange === '1000-1999') {
          matchesPrice = price >= 1000 && price <= 1999;
        } else if (priceRange === '2000-3999') {
          matchesPrice = price >= 2000 && price <= 3999;
        } else if (priceRange === '4000-5999') {
          matchesPrice = price >= 4000 && price <= 5999;
        } else if (priceRange === '6000+') {
          matchesPrice = price >= 6000;
        }
      }
      
      return matchesSearch && matchesPrice;
    });
    
    renderProperties(filteredProperties);
  }

  function showPropertyDetails(property) {
    // Check if property is already liked
    const isLiked = isPropertyLiked(property.id);
    
    propertyDetails.innerHTML = `
      <div class="property-detail-header">
        <h3>${property.title}</h3>
        <p><i class="fas fa-map-marker-alt"></i> ${property.address}</p>
      </div>
      
      <div class="property-detail-section">
        <div class="property-detail-item">
          <div class="property-detail-label">Price:</div>
          <div class="property-detail-value">$${property.price}/month</div>
        </div>
        <div class="property-detail-item">
          <div class="property-detail-label">Bedrooms:</div>
          <div class="property-detail-value">${property.bedrooms}</div>
        </div>
        <div class="property-detail-item">
          <div class="property-detail-label">Bathrooms:</div>
          <div class="property-detail-value">${property.bathrooms}</div>
        </div>
        ${property.zipcode ? `
          <div class="property-detail-item">
            <div class="property-detail-label">Zip Code:</div>
            <div class="property-detail-value">${property.zipcode}</div>
          </div>` : ''}
      </div>
      
      <div class="property-detail-section">
        <h4>Description</h4>
        <p>${property.description || 'No description provided.'}</p>
      </div>
      
      <div class="property-detail-actions">
        <button data-id="${property.id}" class="btn inquire-property-btn">Inquire About This Property</button>
        <button data-id="${property.id}" class="btn ${isLiked ? 'liked' : ''} like-property-btn">
          <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i> ${isLiked ? 'Saved' : 'Like Property'}
        </button>
      </div>
    `;
    
    // Add inquire button functionality
    propertyDetails.querySelector('.inquire-property-btn').addEventListener('click', async () => {
      const listing_id = property.id;

      // 1) Prompt for tenant's email
      const email = prompt('Please enter your email so the owner can follow up:');
      if (!email) {
        alert('Email is required to send an inquiry.');
        return;
      }

      // 2) Prompt for optional note
      const note = prompt('Enter a message for the owner (optional):', '');
      const message = `Email: ${email}` + (note ? `\nMessage: ${note}` : '');

      try {
        const resp = await fetch('/api/inquiries', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ listing_id, tenant_id: user.id, message })
        });

        if (resp.ok) {
          alert('Inquiry sent! The owner will reach out via email.');
          modal.style.display = 'none';
        } else {
          const err = await resp.json();
          alert('Error: ' + (err.message || err.msg || 'Unable to send inquiry'));
        }
      } catch (e) {
        console.error(e);
        alert('Error sending inquiry.');
      }
    });
    
    // Add like button functionality
    propertyDetails.querySelector('.like-property-btn').addEventListener('click', () => {
      toggleLikeProperty(property);
    });
    
    modal.style.display = 'block';
  }

  // Add event listeners for search and price filter
  searchInput.addEventListener('input', filterProperties);
  priceFilter.addEventListener('change', filterProperties);

  try {
    const res = await fetch('/api/listings');
    
    if (!res.ok) {
      throw new Error('Failed to fetch listings');
    }
    
    allProperties = await res.json();
    
    // Initialize filtered properties with all properties
    filteredProperties = [...allProperties];
    
    // Render all properties initially
    renderProperties(filteredProperties);
    
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p>Error loading properties: ' + err.message + '</p>';
  }
});