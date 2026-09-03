const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');

const systemInfo = require('./services/systemInfo');
const drivesSvc = require('./services/drives');
const drivers = require('./services/drivers');
const startup = require('./services/startup');
const services_ = require('./services/services_');
const diskHealth = require('./services/diskHealth');
const cleanup = require('./services/cleanup');
const elevation = require('./services/elevation');
const restorePoint = require('./services/restorePoint');
const activityLog = require('./services/activityLog');

app.disableHardwareAcceleration();

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1040,
    minHeight: 680,
    backgroundColor: '#0C4133',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  activityLog.setMainWindow(mainWindow);

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[renderer] ${message} (${sourceId}:${line})`);
  });
  mainWindow.webContents.on('did-fail-load', (_event, code, description) => {
    console.error(`[renderer] failed to load: ${code} ${description}`);
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[main] render-process-gone', JSON.stringify(details));
  });
  mainWindow.webContents.on('unresponsive', () => console.error('[main] renderer unresponsive'));
  mainWindow.on('unresponsive', () => console.error('[main] window unresponsive'));
  mainWindow.on('close', (e) => console.log('[main] window close event'));
  mainWindow.on('closed', () => console.log('[main] window closed event'));

  // Normally comes from ELECTRON_START_URL, but a UAC-elevated relaunch loses
  // in-memory env vars, so elevation.js also carries it as a CLI flag.
  const startUrlArg = process.argv.find((a) => a.startsWith('--start-url='));
  const devUrl = process.env.ELECTRON_START_URL || (startUrlArg ? startUrlArg.slice('--start-url='.length) : null);
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist-renderer', 'index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

function handle(channel, fn) {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return await fn(...args);
    } catch (e) {
      return { __error: true, message: e?.message || String(e) };
    }
  });
}

function registerIpc() {
  handle('system:getInfo', () => systemInfo.getSystemInfo());
  handle('system:getLoad', () => systemInfo.getLoad());
  handle('system:getDrives', () => drivesSvc.getDrives());

  handle('drivers:scan', () => drivers.scanDrivers());
  handle('drivers:openVendorPage', (url) => drivers.openVendorPage(url));

  handle('perf:getStartupItems', () => startup.getStartupItems());
  handle('perf:toggleStartupItem', async (id, enable) => {
    const items = await startup.getStartupItems();
    const prev = items.find((i) => i.id === id);
    await startup.toggleStartupItem(id, enable);
    await activityLog.addEntry({
      action: enable ? 'Enabled startup program' : 'Disabled startup program',
      detail: prev?.name || id,
      rollback: prev ? { type: 'startup-toggle', payload: { id, previousEnabled: prev.enabled } } : null,
    });
    return { ok: true };
  });

  handle('perf:getIdleServices', () => services_.getIdleServices());
  handle('perf:setServiceStartupType', async (name, startupType) => {
    const before = await services_.getIdleServices();
    const prev = before.find((s) => s.name === name);
    await services_.setServiceStartupType(name, startupType);
    await activityLog.addEntry({
      action: 'Changed service startup type',
      detail: `${prev?.label || name} → ${startupType}`,
      rollback: prev ? { type: 'service-startup-type', payload: { name, previousStartType: prev.startType } } : null,
    });
    return { ok: true };
  });

  handle('perf:getDiskHealth', () => diskHealth.getDiskHealth());
  handle('perf:getBootTime', () => diskHealth.getBootTime());

  handle('cleanup:scan', () => cleanup.scanCleanupCategories());
  handle('cleanup:delete', async (categoryIds, createRestorePointFirst) => {
    if (createRestorePointFirst) {
      const rp = await restorePoint.createRestorePoint('PC Health Console — pre-cleanup checkpoint');
      await activityLog.addEntry({
        action: 'Restore point created',
        detail: rp.ok ? (rp.throttled ? rp.message : 'Pre-cleanup checkpoint') : `Failed: ${rp.error}`,
        result: rp.ok ? 'Complete' : 'Failed',
      });
    }
    const results = await cleanup.deleteCleanupSelection(categoryIds);
    for (const [id, r] of Object.entries(results)) {
      await activityLog.addEntry({
        action: r.permanent ? 'Emptied Recycle Bin' : 'Deleted temporary files',
        detail: r.ok
          ? `${cleanup.fmt(r.freedBytes)} across ${r.freedCount} item${r.freedCount === 1 ? '' : 's'} in "${id}"${r.permanent ? ' — permanent' : ' — moved to Recycle Bin'}`
          : `Failed: ${r.error || `${r.failedCount || 0} item(s) could not be removed`}`,
        result: r.ok ? 'Complete' : 'Failed',
      });
    }
    return results;
  });

  handle('elevation:status', () => elevation.getElevationStatus());
  handle('elevation:request', async () => {
    const result = await elevation.requestElevation();
    if (result.ok) {
      await activityLog.addEntry({ action: 'Elevation requested', detail: 'Relaunching with administrator access' });
    }
    return result;
  });

  handle('system:createRestorePoint', async (description) => {
    const rp = await restorePoint.createRestorePoint(description);
    await activityLog.addEntry({
      action: 'Restore point created',
      detail: rp.ok ? (rp.throttled ? rp.message : (description || 'Manual checkpoint')) : `Failed: ${rp.error}`,
      result: rp.ok ? 'Complete' : 'Failed',
    });
    return rp;
  });

  handle('activity:list', () => activityLog.listEntries());
  handle('activity:rollback', (id) => activityLog.rollbackEntry(id));
}

process.on('uncaughtException', (err) => {
  console.error('[main] uncaughtException', err.stack || err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[main] unhandledRejection', reason);
});
app.on('child-process-gone', (_event, details) => {
  console.error('[main] child-process-gone', JSON.stringify(details));
});
app.on('before-quit', () => console.log('[main] before-quit'));
app.on('will-quit', () => console.log('[main] will-quit'));

app.whenReady().then(() => {
  console.log('[main] app ready, gpu-info:', app.getGPUFeatureStatus ? JSON.stringify(app.getGPUFeatureStatus()) : 'n/a');
  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  console.log('[main] window-all-closed event');
  if (process.platform !== 'darwin') app.quit();
});
