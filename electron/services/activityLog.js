const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { app } = require('electron');

let logPath = null;
let cache = null;
let mainWindowRef = null;

function getLogPath() {
  if (!logPath) logPath = path.join(app.getPath('userData'), 'activity-log.json');
  return logPath;
}

function setMainWindow(win) {
  mainWindowRef = win;
}

async function load() {
  if (cache) return cache;
  try {
    const raw = await fsp.readFile(getLogPath(), 'utf8');
    cache = JSON.parse(raw);
  } catch {
    cache = [];
  }
  return cache;
}

async function persist() {
  await fsp.mkdir(path.dirname(getLogPath()), { recursive: true });
  await fsp.writeFile(getLogPath(), JSON.stringify(cache, null, 2), 'utf8');
}

function notifyRenderer() {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('activity:update', cache);
  }
}

/**
 * @param {object} entry
 * @param {string} entry.action - short title, e.g. "Disabled startup program"
 * @param {string} entry.detail - specifics, e.g. "Adobe Creative Cloud"
 * @param {string} [entry.result] - 'Complete' | 'Cancelled' | 'Failed'
 * @param {{type: string, payload: object}|null} [entry.rollback] - reconstructable rollback action
 */
async function addEntry(entry) {
  await load();
  const record = {
    id: `a${Date.now()}${Math.round(Math.random() * 1000)}`,
    time: new Date().toISOString(),
    action: entry.action,
    detail: entry.detail || '',
    result: entry.result || 'Complete',
    rollback: entry.rollback || null,
    rolledBack: false,
  };
  cache.unshift(record);
  cache = cache.slice(0, 500);
  await persist();
  notifyRenderer();
  return record;
}

async function listEntries() {
  return load();
}

async function rollbackEntry(id) {
  await load();
  const entry = cache.find((e) => e.id === id);
  if (!entry) return { ok: false, error: 'Entry not found' };
  if (!entry.rollback) return { ok: false, error: 'This action cannot be rolled back' };
  if (entry.rolledBack) return { ok: false, error: 'Already rolled back' };

  try {
    if (entry.rollback.type === 'startup-toggle') {
      const { toggleStartupItem } = require('./startup');
      await toggleStartupItem(entry.rollback.payload.id, entry.rollback.payload.previousEnabled);
    } else if (entry.rollback.type === 'service-startup-type') {
      const { setServiceStartupType } = require('./services_');
      await setServiceStartupType(entry.rollback.payload.name, entry.rollback.payload.previousStartType);
    } else {
      return { ok: false, error: `Unknown rollback type: ${entry.rollback.type}` };
    }
  } catch (e) {
    return { ok: false, error: e.message };
  }

  entry.rolledBack = true;
  await persist();
  await addEntry({ action: 'Rolled back change', detail: `${entry.action} — ${entry.detail}`, result: 'Complete', rollback: null });
  return { ok: true };
}

module.exports = { setMainWindow, addEntry, listEntries, rollbackEntry, getLogPath };
