const { apiRequest } = require('./apiClient');

function searchFlights(params) {
  return apiRequest('/flight/search', { method: 'POST', body: params });
}

function quoteFare(params) {
  return apiRequest('/flight/farequote', { method: 'POST', body: params });
}

function validateFare(params) {
  return apiRequest('/flight/validatefare', { method: 'POST', body: params });
}

function issueTicket(params) {
  const bookingId = String(params && params.bookingId || '').trim();
  if (!bookingId) {
    const error = new Error('Booking ID is required to issue a ticket');
    error.status = 400;
    throw error;
  }
  return apiRequest(`/flight/generatepnr?bookingId=${encodeURIComponent(bookingId)}`, { method: 'POST' });
}

module.exports = { searchFlights, quoteFare, validateFare, issueTicket };
