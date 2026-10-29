const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { searchFlights, quoteFare, validateFare, issueTicket } = require('./src/flights');
const { searchHotels } = require('./src/hotels');
const { CREDENTIALS_PATH, CONFIG_DIR, ensureCredentialsFile, validateBaseUrl } = require('./src/config');
const { IS_SEA } = require('./src/paths');

const PORT = Number(process.env.PORT) || 3000;
const MAX_PORT_TRIES = 20;
const DIST = path.join(__dirname, 'dist');
const OPEN_BROWSER = (IS_SEA || process.env.OPEN_BROWSER === '1') && process.env.NO_BROWSER !== '1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const API_ROUTES = {
  '/api/flight/search': searchFlights,
  '/api/farequote': quoteFare,
  '/api/validatefare': validateFare,
  '/api/issueticket': issueTicket,
  '/api/hotel/search': searchHotels,
};

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function readBody(req, limit = 1e6) {
  return new Promise((resolve, reject) => {
    let body = '';
    let tooLarge = false;
    req.on('data', (chunk) => {
      if (tooLarge) return;
      body += chunk;
      if (body.length > limit) {
        tooLarge = true;
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!tooLarge) resolve(body);
    });
    req.on('error', reject);
  });
}

async function handleApi(req, res, handler) {
  if (req.method !== 'POST') return sendJson(res, 405, { message: 'Method not allowed' });
  try {
    const raw = await readBody(req);
    const payload = raw ? JSON.parse(raw) : {};
    const data = await handler(payload);
    sendJson(res, 200, data);
  } catch (err) {
    sendJson(res, err.status || 500, err.data || { message: err.message });
  }
}

function validateBrowserApiRequest(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    let originUrl;
    try {
      originUrl = new URL(origin);
    } catch {
      sendJson(res, 403, { message: 'Invalid request origin' });
      return false;
    }

    if (originUrl.protocol !== 'http:' || originUrl.host !== req.headers.host) {
      sendJson(res, 403, { message: 'Cross-origin API requests are not allowed' });
      return false;
    }
  }

  if (req.method === 'POST' && req.headers['content-type']?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    sendJson(res, 415, { message: 'Content-Type must be application/json' });
    return false;
  }

  return true;
}

function readCredentialsFile() {
  try {
    return JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function maskSecret(secret) {
  if (!secret) return '';
  return secret.length <= 4 ? '****' : '*'.repeat(8) + secret.slice(-4);
}

async function handleSettings(req, res) {
  if (req.method === 'GET') {
    const creds = readCredentialsFile();
    return sendJson(res, 200, {
      baseUrl: creds.baseUrl || '',
      clientId: creds.clientId || '',
      hasSecret: Boolean(creds.clientSecret),
      clientSecretMasked: maskSecret(creds.clientSecret),
    });
  }

  if (req.method === 'POST') {
    try {
      const input = JSON.parse((await readBody(req)) || '{}');
      const current = readCredentialsFile();
      const updated = {
        baseUrl: validateBaseUrl(String(input.baseUrl || current.baseUrl || '').trim()),
        clientId: String(input.clientId || '').trim(),
        clientSecret: String(input.clientSecret || '').trim() || current.clientSecret || '',
      };

      if (!updated.clientId) return sendJson(res, 400, { message: 'Client ID is required' });
      if (!updated.clientSecret) return sendJson(res, 400, { message: 'Client Secret is required' });

      fs.mkdirSync(path.dirname(CREDENTIALS_PATH), { recursive: true });
      fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(updated, null, 2) + '\n');
      return sendJson(res, 200, { message: 'Saved' });
    } catch (err) {
      return sendJson(res, 400, { message: err.message });
    }
  }

  sendJson(res, 405, { message: 'Method not allowed' });
}

const BRANDING_DIR = path.join(CONFIG_DIR, 'branding');
const BRANDING_PATH = path.join(BRANDING_DIR, 'branding.json');
const DEFAULT_BRAND_NAME = "EndFare Tour & Travel's";
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/svg+xml': '.svg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function readBranding() {
  try {
    return JSON.parse(fs.readFileSync(BRANDING_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function logoPath(branding) {
  if (!branding.logoFile) return null;
  const file = path.join(BRANDING_DIR, path.basename(branding.logoFile));
  return fs.existsSync(file) ? file : null;
}

function removeLogoFiles() {
  for (const ext of Object.values(LOGO_TYPES)) {
    fs.rmSync(path.join(BRANDING_DIR, 'logo' + ext), { force: true });
  }
}

async function handleBranding(req, res) {
  if (req.method === 'GET') {
    const branding = readBranding();
    const file = logoPath(branding);
    return sendJson(res, 200, {
      brandName: branding.brandName || DEFAULT_BRAND_NAME,
      defaultBrandName: DEFAULT_BRAND_NAME,
      // Version query busts the browser cache after a new upload.
      logoUrl: file ? `/branding/logo?v=${Math.floor(fs.statSync(file).mtimeMs)}` : null,
    });
  }

  if (req.method === 'POST') {
    try {
      const input = JSON.parse((await readBody(req, 4e6)) || '{}');
      const branding = readBranding();

      const brandName = String(input.brandName || '').trim();
      if (brandName.length > 60) return sendJson(res, 400, { message: 'Brand name must be 60 characters or fewer' });
      branding.brandName = brandName || DEFAULT_BRAND_NAME;

      fs.mkdirSync(BRANDING_DIR, { recursive: true });

      if (input.removeLogo) {
        removeLogoFiles();
        delete branding.logoFile;
      } else if (input.logo) {
        const match = /^data:([\w/+.-]+);base64,(.+)$/.exec(input.logo);
        const ext = match && LOGO_TYPES[match[1]];
        if (!ext) return sendJson(res, 400, { message: 'Logo must be PNG, JPG, SVG, WEBP or GIF' });
        const buffer = Buffer.from(match[2], 'base64');
        if (buffer.length > MAX_LOGO_BYTES) return sendJson(res, 400, { message: 'Logo must be 2 MB or smaller' });
        removeLogoFiles();
        fs.writeFileSync(path.join(BRANDING_DIR, 'logo' + ext), buffer);
        branding.logoFile = 'logo' + ext;
      }

      fs.writeFileSync(BRANDING_PATH, JSON.stringify(branding, null, 2) + '\n');
      return sendJson(res, 200, { message: 'Saved' });
    } catch (err) {
      return sendJson(res, 400, { message: err.message });
    }
  }

  sendJson(res, 405, { message: 'Method not allowed' });
}

function serveLogo(res) {
  const file = logoPath(readBranding());
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('No logo');
  }
  const type = Object.keys(LOGO_TYPES).find((t) => LOGO_TYPES[t] === path.extname(file)) || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': type,
    'X-Content-Type-Options': 'nosniff',
    // Prevent scripts inside uploaded SVGs from running if the logo is opened directly.
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
    'Cache-Control': 'no-cache',
  });
  fs.createReadStream(file).pipe(res);
}

function readStaticFile(pathname) {
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  if (IS_SEA) {
    try {
      return Buffer.from(require('node:sea').getAsset(path.posix.normalize(relative)));
    } catch {
      return null;
    }
  }
  const filePath = path.normalize(path.join(DIST, relative));
  if (!filePath.startsWith(DIST + path.sep)) return null;
  try {
    return fs.readFileSync(filePath);
  } catch {
    return null;
  }
}

function serveStatic(req, res, pathname) {
  const content = readStaticFile(pathname);
  if (!content) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not found');
  }
  const ext = path.extname(pathname === '/' ? 'index.html' : pathname);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  res.end(content);
}

function findChrome() {
  if (process.platform !== 'win32') return null;
  const candidates = [
    process.env['PROGRAMFILES'],
    process.env['PROGRAMFILES(X86)'],
    process.env['LOCALAPPDATA'],
  ]
    .filter(Boolean)
    .map((base) => path.join(base, 'Google', 'Chrome', 'Application', 'chrome.exe'));
  return candidates.find((p) => fs.existsSync(p)) || null;
}

// Prefer Google Chrome when installed, otherwise use the default browser.
function openBrowser(url) {
  const chrome = findChrome();
  if (chrome) {
    const child = require('child_process').spawn(chrome, ['--new-window', url], { detached: true, stdio: 'ignore' });
    child.on('error', () => openDefaultBrowser(url));
    child.unref();
    return;
  }
  openDefaultBrowser(url);
}

function openDefaultBrowser(url) {
  const cmd =
    process.platform === 'win32' ? `start "" "${url}"` :
    process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.log(`Open ${url} in your browser.`);
  });
}

// If a previous copy of the demo is already running on this port, reuse it.
function isDemoRunning(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/api/branding', timeout: 1500 }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          resolve(Boolean(JSON.parse(body).defaultBrandName));
        } catch {
          resolve(false);
        }
      });
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

function exitAfterKeypress(code) {
  if (!IS_SEA || !process.stdin.isTTY) return process.exit(code);
  console.log('\nPress any key to close this window...');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.once('data', () => process.exit(code));
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  if (pathname.startsWith('/api/') && !validateBrowserApiRequest(req, res)) return;
  if (pathname === '/api/settings') return handleSettings(req, res);
  if (pathname === '/api/branding') return handleBranding(req, res);
  if (pathname === '/branding/logo') return serveLogo(res);
  const handler = API_ROUTES[pathname];
  if (handler) return handleApi(req, res, handler);
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    res.writeHead(400);
    return res.end('Bad request');
  }
  serveStatic(req, res, decoded);
});

async function start(port, attempt = 0) {
  if (await isDemoRunning(port)) {
    const url = `http://localhost:${port}`;
    console.log(`The demo is already running at ${url}`);
    if (OPEN_BROWSER) openBrowser(url);
    return setTimeout(() => process.exit(0), 1500);
  }

  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempt < MAX_PORT_TRIES) return start(port + 1, attempt + 1);
    console.error(`Could not start server: ${err.message}`);
    exitAfterKeypress(1);
  });

  server.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${port}`;
    console.log('==============================================');
    console.log(`  EndFare Tour & Travel's API Demo`);
    console.log(`  Running at ${url}`);
    if (IS_SEA) console.log('  Close this window to stop the demo.');
    console.log('==============================================');
    if (OPEN_BROWSER) openBrowser(url);
  });
}

process.on('uncaughtException', (err) => {
  console.error(`Unexpected error: ${err.stack || err.message}`);
  exitAfterKeypress(1);
});

if (!IS_SEA && !fs.existsSync(DIST)) {
  console.error('dist/ not found. Run "npm run build" first.');
  process.exit(1);
}

if (ensureCredentialsFile()) {
  console.log(`Created ${CREDENTIALS_PATH}. Open Settings in the demo to add your Client ID and Secret.`);
}

start(PORT);
