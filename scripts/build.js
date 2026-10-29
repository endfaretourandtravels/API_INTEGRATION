const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'public');
const dist = path.join(root, 'dist');

fs.rmSync(dist, { recursive: true, force: true });
fs.cpSync(src, dist, { recursive: true });

const credsPath = path.join(root, 'config', 'credentials.json');
if (!fs.existsSync(credsPath)) {
  fs.copyFileSync(path.join(root, 'config', 'credentials.example.json'), credsPath);
  console.log('Created config/credentials.json from example. Add your credentials there.');
}

const files = fs.readdirSync(dist);
console.log(`Build complete: ${files.length} files -> dist/ (${files.join(', ')})`);
