// js/analytics.js
document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!user.id || user.role !== 'owner') {
      alert('This page is for property owners only');
      return location.href = 'login.html';
    }
    
    try {
      // Fetch all necessary data
      const [listingsRes, inquiriesRes] = await Promise.all([
        fetch('/api/listings'),
        fetch('/api/inquiries')
      ]);
      
      if (!listingsRes.ok || !inquiriesRes.ok) {
        throw new Error('Failed to fetch data for analytics');
      }
      
      const [allListings, allInquiries] = await Promise.all([
        listingsRes.json(), 
        inquiriesRes.json()
      ]);
      
      // Filter to this owner's data
      const myListings = allListings.filter(l => l.owner_id === user.id);
      const myInquiries = allInquiries.filter(i => 
        myListings.some(l => l.id === i.listing_id)
      );
      
      // If no data is available, show a message to the user
      if (myListings.length === 0) {
        document.getElementById('analytics-container').innerHTML = `
          <div class="empty-state">
            <i class="fas fa-chart-line empty-icon"></i>
            <h3>No Data Available</h3>
            <p>You don't have any listings yet. Create your first listing to start seeing analytics data.</p>
            <a href="create_listing.html" class="btn">Create Listing</a>
          </div>
        `;
        return;
      }
      
      // Update overview metrics
      updateOverviewMetrics(myListings, myInquiries);
      
      // Generate charts
      generateInquiryTrendChart(myInquiries);
      generatePropertyInterestChart(myListings, myInquiries);
      
      // Generate insights
      generateInsights(myListings, myInquiries);
      
    } catch (err) {
      console.error('Error loading analytics data:', err);
      alert('Failed to load analytics data. Please try again later.');
    }
  });
  
  // Update overview metrics
  function updateOverviewMetrics(listings, inquiries) {
    // Display real data count
    document.getElementById('total-listings').textContent = listings.length;
    document.getElementById('total-inquiries').textContent = inquiries.length;
  }
  
  // Generate Inquiry Trend Chart based on real inquiry dates
  function generateInquiryTrendChart(inquiries) {
    // Create date buckets for the inquiries
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const inquiryCounts = Array(12).fill(0);
    
    // Count inquiries per month
    inquiries.forEach(inquiry => {
      if (inquiry.sent_at) {
        const inqDate = new Date(inquiry.sent_at);
        inquiryCounts[inqDate.getMonth()]++;
      }
    });
    
    // Only show months with data
    const hasData = inquiryCounts.some(count => count > 0);
    
    if (!hasData) {
      document.getElementById('inquiry-trend-container').innerHTML = `
        <div class="no-data-message">
          <p>No inquiry data available yet. This chart will populate as you receive inquiries.</p>
        </div>
      `;
      return;
    }
    
    const ctx = document.getElementById('inquiryTrendChart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Inquiries',
          data: inquiryCounts,
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          borderWidth: 2,
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Monthly Inquiry Trends'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
  }
  
  // Generate Property Interest Distribution Chart
  function generatePropertyInterestChart(listings, inquiries) {
    // Count inquiries per listing
    const listingInterest = {};
    
    inquiries.forEach(inq => {
      if (listingInterest[inq.listing_id]) {
        listingInterest[inq.listing_id]++;
      } else {
        listingInterest[inq.listing_id] = 1;
      }
    });
    
    // Check if there's any interest data
    const hasInterestData = Object.keys(listingInterest).length > 0;
    
    if (!hasInterestData) {
      document.getElementById('property-interest-container').innerHTML = `
        <div class="no-data-message">
          <p>No interest data available yet. This chart will populate as your properties receive inquiries.</p>
        </div>
      `;
      return;
    }
    
    // Prepare data for chart
    const labels = [];
    const data = [];
    const backgroundColors = [
      'rgba(52, 152, 219, 0.7)',
      'rgba(46, 204, 113, 0.7)',
      'rgba(155, 89, 182, 0.7)',
      'rgba(241, 196, 15, 0.7)',
      'rgba(230, 126, 34, 0.7)',
      'rgba(231, 76, 60, 0.7)',
      'rgba(26, 188, 156, 0.7)',
      'rgba(41, 128, 185, 0.7)'
    ];
    
    listings.forEach(listing => {
      // Only include listings that have received inquiries
      if (listingInterest[listing.id]) {
        labels.push(listing.title.substring(0, 15) + (listing.title.length > 15 ? '...' : ''));
        data.push(listingInterest[listing.id]);
      }
    });
    
    const ctx = document.getElementById('propertyInterestChart').getContext('2d');
    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColors.slice(0, labels.length),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
          },
          title: {
            display: true,
            text: 'Interest Distribution by Property'
          }
        }
      }
    });
  }
  
  // Generate insights based on real data
  function generateInsights(listings, inquiries) {
    const insightsContainer = document.getElementById('insights-container');
    const insights = [];
    
    // Check if there's enough data for insights
    if (inquiries.length === 0) {
      insightsContainer.innerHTML = `
        <div class="no-data-message">
          <p>Not enough data to generate insights yet. As you receive more inquiries, we'll provide personalized recommendations to help improve your property performance.</p>
        </div>
      `;
      return;
    }
    
    // Calculate some basic metrics for insights
    const totalListings = listings.length;
    const totalInquiries = inquiries.length;
    
    // Add insights based on real data
    if (totalListings > 0) {
      const avgInquiriesPerListing = totalInquiries / totalListings;
      
      if (avgInquiriesPerListing < 1) {
        insights.push({
          type: 'improvement',
          icon: 'fas fa-exclamation-circle',
          title: 'Low inquiry rate',
          text: 'Your properties are receiving fewer inquiries than average. Consider improving your property descriptions and adding more high-quality images.'
        });
      } else if (avgInquiriesPerListing >= 3) {
        insights.push({
          type: 'positive',
          icon: 'fas fa-check-circle',
          title: 'High inquiry rate',
          text: 'Your properties are receiving a good number of inquiries. Keep up the good work!'
        });
      }
    }
    
    // Find properties with no inquiries
    const propertiesWithoutInquiries = listings.filter(listing => 
      !inquiries.some(inq => inq.listing_id === listing.id)
    );
    
    if (propertiesWithoutInquiries.length > 0 && totalListings > 1) {
      insights.push({
        type: 'improvement',
        icon: 'fas fa-exclamation-triangle',
        title: 'Underperforming properties',
        text: `${propertiesWithoutInquiries.length} of your properties have received no inquiries. Consider updating these listings with more details or better photos.`
      });
    }
    
    // Check if there are any viewed inquiries
    const viewedInquiries = inquiries.filter(inq => inq.status === 'viewed' || inq.status === 'responded');
    const newInquiries = inquiries.filter(inq => inq.status === 'new');
    
    if (newInquiries.length > 0) {
      insights.push({
        type: 'info',
        icon: 'fas fa-envelope',
        title: 'Unread inquiries',
        text: `You have ${newInquiries.length} unread inquiries. Responding quickly increases your chances of finding tenants.`
      });
    }
    
    // Add a general tip if there are few insights
    if (insights.length < 2) {
      insights.push({
        type: 'tip',
        icon: 'fas fa-lightbulb',
        title: 'Complete property descriptions',
        text: 'Make sure your listings have detailed descriptions, accurate pricing, high-quality photos, and highlight key amenities to attract more potential tenants.'
      });
    }
    
    // Render insights
    insightsContainer.innerHTML = insights.map(insight => `
      <div class="insight-card ${insight.type}">
        <div class="insight-icon"><i class="${insight.icon}"></i></div>
        <div class="insight-content">
          <h4>${insight.title}</h4>
          <p>${insight.text}</p>
        </div>
      </div>
    `).join('');
  }