// Waits for the Vite dev server, then launches Electron pointed at it.
// Run under plain Node (not Electron), so `require('electron')` resolves to
// the path of the electron binary rather than the Electron API.
const path = require('path');
const { spawn } = require('child_process');
const waitOn = require('wait-on');
const electronPath = require('electron');

const URL = 'http://localhost:5173';

waitOn({ resources: [URL], timeout: 30000 }).then(() => {
  const child = spawn(electronPath, [path.join(__dirname, 'main.js')], {
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_START_URL: URL },
  });
  child.on('exit', (code) => process.exit(code ?? 0));
}).catch((err) => {
  console.error('Vite dev server did not start in time:', err.message);
  process.exit(1);
});
