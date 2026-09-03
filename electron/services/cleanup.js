const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { shell } = require('electron');
const { runPowerShellJson } = require('../powershell');

async function dirStats(dirPath, { maxDepth = 14, maxFiles = 200000 } = {}) {
  let totalSize = 0;
  const files = [];

  async function walk(dir, depth) {
    if (depth > maxDepth || files.length >= maxFiles) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (files.length >= maxFiles) return;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.isSymbolicLink()) {
        await walk(full, depth + 1);
      } else if (entry.isFile()) {
        try {
          const st = await fs.stat(full);
          totalSize += st.size;
          files.push(full);
        } catch {
          /* locked or inaccessible — skip, don't fail the whole scan */
        }
      }
    }
  }

  try {
    await fs.access(dirPath);
  } catch {
    return { totalSize: 0, fileCount: 0, files: [], exists: false };
  }
  await walk(dirPath, 0);
  return { totalSize, fileCount: files.length, files, exists: true };
}

function fmt(bytes) {
  if (bytes >= 1024 ** 3) return `${Math.round((bytes / 1024 ** 3) * 10) / 10} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

const WINDOWS_DIR = process.env.SystemRoot || 'C:\\Windows';

async function scanTemp() {
  const results = await Promise.all([
    dirStats(os.tmpdir()),
    dirStats(path.join(WINDOWS_DIR, 'Temp')),
  ]);
  const files = results.flatMap((r) => r.files);
  const totalSize = results.reduce((a, r) => a + r.totalSize, 0);
  return {
    id: 'temp', name: 'Windows Temp', tag: 'Safe', permanent: false,
    note: `${os.tmpdir()} and ${path.join(WINDOWS_DIR, 'Temp')} — files currently in use are skipped automatically`,
    sizeBytes: totalSize, fileCount: files.length, files,
  };
}

async function scanBrowserCaches() {
  const local = process.env.LOCALAPPDATA || '';
  const candidates = [
    path.join(local, 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache'),
    path.join(local, 'Microsoft', 'Edge', 'User Data', 'Default', 'Code Cache'),
    path.join(local, 'Google', 'Chrome', 'User Data', 'Default', 'Cache'),
    path.join(local, 'Google', 'Chrome', 'User Data', 'Default', 'Code Cache'),
  ];

  // Firefox nests cache under a randomized profile folder name — resolve it dynamically.
  try {
    const ffRoot = path.join(local, 'Mozilla', 'Firefox', 'Profiles');
    const profiles = await fs.readdir(ffRoot).catch(() => []);
    for (const p of profiles) {
      if (/\.default/i.test(p)) candidates.push(path.join(ffRoot, p, 'cache2'));
    }
  } catch { /* firefox not installed */ }

  const results = await Promise.all(candidates.map((c) => dirStats(c)));
  const found = results.filter((r) => r.exists);
  const files = found.flatMap((r) => r.files);
  const totalSize = found.reduce((a, r) => a + r.totalSize, 0);
  const browserNames = found.length ? 'detected browser caches' : 'no browser caches found on this PC';

  return {
    id: 'browser', name: 'Browser Caches', tag: 'Safe', permanent: false,
    note: found.length ? `Edge/Chrome/Firefox — signed-in sessions are kept, only cached page assets are removed` : browserNames,
    sizeBytes: totalSize, fileCount: files.length, files,
  };
}

const RECYCLE_BIN_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
$size = 0; $count = 0
Get-ChildItem -Path ("$env:SystemDrive" + '\$Recycle.Bin') -Force -Recurse -ErrorAction SilentlyContinue -File |
  ForEach-Object { $size += $_.Length; $count++ }
@{ sizeBytes = $size; count = $count } | ConvertTo-Json -Compress
`;

async function scanRecycleBin() {
  const r = await runPowerShellJson(RECYCLE_BIN_SCRIPT, { timeoutMs: 15000 }).catch(() => ({ sizeBytes: 0, count: 0 }));
  return {
    id: 'bin', name: 'Recycle Bin', tag: 'Review', permanent: true,
    note: 'Emptying the Recycle Bin is permanent — these items cannot be restored afterwards',
    sizeBytes: r?.sizeBytes || 0, fileCount: r?.count || 0, files: [],
  };
}

async function scanWindowsUpdateLeftovers() {
  const r = await dirStats(path.join(WINDOWS_DIR, 'SoftwareDistribution', 'Download'));
  return {
    id: 'update', name: 'Windows Update Leftovers', tag: 'Review', permanent: false,
    note: 'Superseded update packages — Windows re-downloads what it needs; may need admin to fully clear',
    sizeBytes: r.totalSize, fileCount: r.fileCount, files: r.files,
  };
}

async function scanOldLogs() {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const dirs = [
    path.join(WINDOWS_DIR, 'Logs', 'CBS'),
    path.join(WINDOWS_DIR, 'Logs', 'DISM'),
    path.join(WINDOWS_DIR, 'Panther'),
  ];
  let totalSize = 0;
  const files = [];
  for (const dir of dirs) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isFile() || !/\.(log|etl)$/i.test(entry.name)) continue;
      const full = path.join(dir, entry.name);
      try {
        const st = await fs.stat(full);
        if (st.mtimeMs < cutoff) {
          totalSize += st.size;
          files.push(full);
        }
      } catch { /* skip */ }
    }
  }
  return {
    id: 'logs', name: 'Old Log Files', tag: 'Safe', permanent: false,
    note: 'CBS, DISM and setup logs older than 30 days',
    sizeBytes: totalSize, fileCount: files.length, files,
  };
}

async function scanDeliveryOptimization() {
  const r = await dirStats(path.join(WINDOWS_DIR, 'SoftwareDistribution', 'DeliveryOptimization', 'Cache'));
  return {
    id: 'delivery', name: 'Delivery Optimization Files', tag: 'Safe', permanent: false,
    note: 'Peer-to-peer update cache — rebuilds automatically on next update',
    sizeBytes: r.totalSize, fileCount: r.fileCount, files: r.files,
  };
}

async function scanCleanupCategories() {
  const categories = await Promise.all([
    scanTemp(),
    scanBrowserCaches(),
    scanRecycleBin(),
    scanWindowsUpdateLeftovers(),
    scanOldLogs(),
    scanDeliveryOptimization(),
  ]);
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    tag: c.tag,
    permanent: c.permanent,
    note: c.note,
    sizeBytes: c.sizeBytes,
    sizeLabel: fmt(c.sizeBytes),
    countLabel: `${c.fileCount.toLocaleString()} file${c.fileCount === 1 ? '' : 's'}`,
  }));
}

// categoryIds selected by the user; re-scans (cheap enough) to get a fresh file
// list rather than trusting a stale list from the initial scan.
async function deleteCleanupSelection(categoryIds) {
  const results = {};
  const allScans = {
    temp: scanTemp, browser: scanBrowserCaches, bin: scanRecycleBin,
    update: scanWindowsUpdateLeftovers, logs: scanOldLogs, delivery: scanDeliveryOptimization,
  };

  for (const id of categoryIds) {
    const scanner = allScans[id];
    if (!scanner) continue;
    const cat = await scanner();

    if (id === 'bin') {
      try {
        await runPowerShellJson(`Clear-RecycleBin -Force -ErrorAction Stop; '{"ok":true}'`, { timeoutMs: 20000 });
        results[id] = { ok: true, freedBytes: cat.sizeBytes, freedCount: cat.fileCount, permanent: true };
      } catch (e) {
        results[id] = { ok: false, error: e.message, freedBytes: 0, freedCount: 0, permanent: true };
      }
      continue;
    }

    let freedBytes = 0;
    let freedCount = 0;
    let failedCount = 0;
    for (const file of cat.files) {
      try {
        const size = await fs.stat(file).then((s) => s.size).catch(() => 0);
        await shell.trashItem(file);
        freedBytes += size;
        freedCount += 1;
      } catch {
        failedCount += 1;
      }
    }
    results[id] = { ok: failedCount === 0, freedBytes, freedCount, failedCount, permanent: false };
  }

  return results;
}

module.exports = { scanCleanupCategories, deleteCleanupSelection, fmt };
