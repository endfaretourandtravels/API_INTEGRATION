const { apiRequest } = require('./apiClient');

// Endpoint path is a placeholder until the hotel API spec is finalized.
function searchHotels(params) {
  return apiRequest('/hotel/search', { method: 'POST', body: params });
}

module.exports = { searchHotels };
