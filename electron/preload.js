const { contextBridge, ipcRenderer } = require('electron');

function invoke(channel) {
  return (...args) => ipcRenderer.invoke(channel, ...args);
}

contextBridge.exposeInMainWorld('electronAPI', {
  getSystemInfo: invoke('system:getInfo'),
  getLoad: invoke('system:getLoad'),
  getDrives: invoke('system:getDrives'),

  scanDrivers: invoke('drivers:scan'),
  openVendorPage: invoke('drivers:openVendorPage'),
  installDriver: invoke('drivers:install'),

  getStartupItems: invoke('perf:getStartupItems'),
  toggleStartupItem: invoke('perf:toggleStartupItem'),
  getIdleServices: invoke('perf:getIdleServices'),
  setServiceStartupType: invoke('perf:setServiceStartupType'),
  getDiskHealth: invoke('perf:getDiskHealth'),
  getBootTime: invoke('perf:getBootTime'),

  scanCleanupCategories: invoke('cleanup:scan'),
  deleteCleanupSelection: invoke('cleanup:delete'),

  getElevationStatus: invoke('elevation:status'),
  requestElevation: invoke('elevation:request'),

  createRestorePoint: invoke('system:createRestorePoint'),

  getActivityLog: invoke('activity:list'),
  rollbackActivity: invoke('activity:rollback'),
  onActivityUpdate: (cb) => {
    const listener = (_event, entries) => cb(entries);
    ipcRenderer.on('activity:update', listener);
    return () => ipcRenderer.removeListener('activity:update', listener);
  },
});
