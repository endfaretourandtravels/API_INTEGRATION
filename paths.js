const path = require('path');

function isSea() {
  try {
    return require('node:sea').isSea();
  } catch {
    return false;
  }
}

const IS_SEA = isSea();

// When packaged as an .exe, user data lives next to the executable.
const APP_DIR = IS_SEA ? path.dirname(process.execPath) : path.join(__dirname, '..');
const CONFIG_DIR = path.join(APP_DIR, 'config');

module.exports = { IS_SEA, APP_DIR, CONFIG_DIR };
