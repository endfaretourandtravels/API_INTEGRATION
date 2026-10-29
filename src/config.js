const fs = require('fs');
const path = require('path');
const { CONFIG_DIR } = require('./paths');

const CREDENTIALS_PATH = path.join(CONFIG_DIR, 'credentials.json');
const DEFAULT_CREDENTIALS = {
  baseUrl: 'https://api.endfare.com/v1',
  clientId: 'YOUR_X_CLIENT_ID',
  clientSecret: 'YOUR_X_CLIENT_SECRET',
};

function ensureCredentialsFile() {
  if (fs.existsSync(CREDENTIALS_PATH)) return false;
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(DEFAULT_CREDENTIALS, null, 2) + '\n');
  return true;
}

// Read on every call so updated credentials are picked up without code changes.
function loadCredentials() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(
      `Credentials file not found at ${CREDENTIALS_PATH}. ` +
        'Open Settings in the demo to add your credentials, or copy config/credentials.example.json to config/credentials.json.'
    );
  }

  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));

  for (const key of ['baseUrl', 'clientId', 'clientSecret']) {
    if (!creds[key]) throw new Error(`Missing "${key}" in ${CREDENTIALS_PATH}`);
  }
  if (creds.clientId.startsWith('YOUR_') || creds.clientSecret.startsWith('YOUR_')) {
    console.warn('[warn] Placeholder credentials detected. Update config/credentials.json with your real keys.\n');
  }

  return creds;
}

module.exports = { loadCredentials, ensureCredentialsFile, CREDENTIALS_PATH, CONFIG_DIR };
