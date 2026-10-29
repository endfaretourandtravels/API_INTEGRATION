const { loadCredentials } = require('./config');

async function apiRequest(endpoint, { method = 'POST', body } = {}) {
  const { baseUrl, clientId, clientSecret } = loadCredentials();
  const url = `${baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  console.log(`--> ${method} ${url}`);

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });
  } catch (err) {
    throw new Error(`Network error calling ${url}: ${err.cause?.message || err.message}`);
  }

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  console.log(`<-- ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const error = new Error(`API request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

module.exports = { apiRequest };
