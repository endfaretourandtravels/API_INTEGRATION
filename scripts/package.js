const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const work = path.join(root, 'build', 'sea');
const releaseName = 'EndFareDemo';
const releaseDir = path.join(root, 'release', releaseName);
const exeName = process.platform === 'win32' ? `${releaseName}.exe` : releaseName;
const exePath = path.join(releaseDir, exeName);

function step(msg) {
  console.log(`\n> ${msg}`);
}

function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}

async function main() {
  step('Building web assets');
  execFileSync(process.execPath, [path.join(__dirname, 'build.js')], { stdio: 'inherit' });

  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });

  step('Bundling server into a single file');
  const bundlePath = path.join(work, 'server.js');
  await require('esbuild').build({
    entryPoints: [path.join(root, 'server.js')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: `node${process.versions.node.split('.')[0]}`,
    outfile: bundlePath,
    logLevel: 'warning',
  });

  step('Generating single-executable blob');
  const assets = Object.fromEntries(listFiles(dist).map((file) => [file, path.join(dist, file)]));
  const blobPath = path.join(work, 'sea-prep.blob');
  const seaConfigPath = path.join(work, 'sea-config.json');
  fs.writeFileSync(
    seaConfigPath,
    JSON.stringify(
      { main: bundlePath, output: blobPath, disableExperimentalSEAWarning: true, useCodeCache: false, assets },
      null,
      2
    )
  );
  execFileSync(process.execPath, ['--experimental-sea-config', seaConfigPath], { stdio: 'inherit' });

  step(`Creating ${path.relative(root, exePath)}`);
  fs.rmSync(releaseDir, { recursive: true, force: true });
  fs.mkdirSync(releaseDir, { recursive: true });
  fs.copyFileSync(process.execPath, exePath);

  if (process.platform === 'win32') {
    step('Applying icon and version info');
    const { rcedit } = require('rcedit');
    const version = require(path.join(root, 'package.json')).version;
    await rcedit(exePath, {
      icon: path.join(root, 'assets', 'app.ico'),
      'file-version': version,
      'product-version': version,
      'version-string': {
        ProductName: "EndFare Tour & Travel's API Demo",
        FileDescription: "EndFare Tour & Travel's API Demo",
        CompanyName: "EndFare Tour & Travel's",
        OriginalFilename: exeName,
        InternalName: releaseName,
        LegalCopyright: '',
      },
    });
  }

  const { inject } = require('postject');
  await inject(exePath, 'NODE_SEA_BLOB', fs.readFileSync(blobPath), {
    sentinelFuse: 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
    machoSegmentName: process.platform === 'darwin' ? 'NODE_SEA' : undefined,
  });

  fs.copyFileSync(path.join(__dirname, 'HOW-TO-RUN.txt'), path.join(releaseDir, 'HOW-TO-RUN.txt'));

  if (process.platform === 'win32') {
    step('Creating zip for sharing');
    const zipPath = path.join(root, 'release', `${releaseName}.zip`);
    fs.rmSync(zipPath, { force: true });
    execFileSync(
      'powershell.exe',
      ['-NoProfile', '-Command', `Compress-Archive -Path '${releaseDir}' -DestinationPath '${zipPath}' -Force`],
      { stdio: 'inherit' }
    );
    console.log(`Zip: ${path.relative(root, zipPath)}`);

    // Double-clickable copy in the project root.
    const rootExe = path.join(root, exeName);
    try {
      fs.copyFileSync(exePath, rootExe);
      console.log(`Launcher: ${path.relative(root, rootExe)}`);
    } catch (err) {
      console.warn(`Could not update ${exeName} in project root (is it running?): ${err.message}`);
    }
  }

  const sizeMb = (fs.statSync(exePath).size / 1024 / 1024).toFixed(1);
  console.log(`\nDone! ${path.relative(root, exePath)} (${sizeMb} MB)`);
  console.log('Share the release folder (or zip). Subscribers just double-click the exe.');
}

main().catch((err) => {
  console.error(`\nPackaging failed: ${err.stack || err.message}`);
  process.exit(1);
});
