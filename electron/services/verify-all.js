// Headless verification: runs every read-only service against THIS real
// machine under plain Node (no Electron GUI needed) and prints the results,
// so we can sanity-check "is this actually my hardware" before wiring the UI.
const systemInfo = require('./systemInfo');
const drives = require('./drives');
const drivers = require('./drivers');
const startup = require('./startup');
const services_ = require('./services_');
const diskHealth = require('./diskHealth');
const cleanup = require('./cleanup');
const elevation = require('./elevation');

async function run(name, fn) {
  const start = Date.now();
  try {
    const result = await fn();
    console.log(`\n=== ${name} (${Date.now() - start}ms) ===`);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.log(`\n=== ${name} FAILED (${Date.now() - start}ms) ===`);
    console.log(e.stack || e.message);
  }
}

(async () => {
  await run('elevation.getElevationStatus', () => elevation.getElevationStatus());
  await run('systemInfo.getSystemInfo', () => systemInfo.getSystemInfo());
  await run('systemInfo.getLoad', () => systemInfo.getLoad());
  await run('drives.getDrives', () => drives.getDrives());
  await run('drivers.scanDrivers', () => drivers.scanDrivers());
  await run('startup.getStartupItems', () => startup.getStartupItems());
  await run('services_.getIdleServices', () => services_.getIdleServices());
  await run('diskHealth.getDiskHealth', () => diskHealth.getDiskHealth());
  await run('diskHealth.getBootTime', () => diskHealth.getBootTime());
  await run('cleanup.scanCleanupCategories', () => cleanup.scanCleanupCategories());
  console.log('\nDone.');
})();
