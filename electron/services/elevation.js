const { app } = require('electron');
const { runPowerShell, runPowerShellJson } = require('../powershell');

const STATUS_SCRIPT = `
$id = [Security.Principal.WindowsIdentity]::GetCurrent()
$p = New-Object Security.Principal.WindowsPrincipal($id)
$isAdmin = $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
@{ isAdmin = [bool]$isAdmin } | ConvertTo-Json -Compress
`;

async function getElevationStatus() {
  const r = await runPowerShellJson(STATUS_SCRIPT, { timeoutMs: 10000 }).catch(() => ({ isAdmin: false }));
  return { isAdmin: !!r?.isAdmin };
}

/**
 * Relaunches this process with a real UAC elevation prompt, then quits the
 * current (non-elevated) instance. Node's child_process has no 'runas' verb
 * on Windows, so this shells out to PowerShell's Start-Process -Verb RunAs,
 * which is what actually triggers the UAC dialog.
 */
async function requestElevation() {
  const exePath = process.execPath;
  // argv[0] is the exe itself in both dev (electron.exe) and packaged builds;
  // everything after it (dev's entry script, any CLI flags) gets replayed.
  const args = process.argv.slice(1);
  // A UAC-elevated relaunch does not inherit in-memory env vars set only via
  // spawn()'s `env` option (only real process/user env survives runas), so
  // the dev server URL — normally passed via ELECTRON_START_URL — has to be
  // carried across as an explicit CLI flag instead.
  if (process.env.ELECTRON_START_URL) {
    args.push(`--start-url=${process.env.ELECTRON_START_URL}`);
  }

  const psSingleQuote = (s) => `'${String(s).replace(/'/g, "''")}'`;
  // Start-Process -ArgumentList joins its array elements with a bare space
  // and does NOT itself quote elements that contain spaces — so a path like
  // "...\PC Health Console App\electron\main.js" gets silently split into
  // several broken argv entries in the elevated process (Electron then can't
  // find a valid entry point at all). Wrapping each argument in literal
  // double quotes (real Windows command-line quoting) before handing it to
  // PowerShell keeps it intact as one argument.
  const winQuote = (s) => `"${String(s).replace(/"/g, '\\"')}"`;
  const argList = args.length ? `-ArgumentList ${args.map((a) => psSingleQuote(winQuote(a))).join(',')}` : '';
  const script = `Start-Process -FilePath ${psSingleQuote(exePath)} ${argList} -Verb RunAs`;

  try {
    await runPowerShell(script, { timeoutMs: 15000 });
    app.quit();
    return { ok: true };
  } catch (e) {
    // Most common cause: user clicked "No" on the UAC prompt.
    console.error('[elevation] requestElevation failed:', e.message);
    return { ok: false, error: e.message };
  }
}

module.exports = { getElevationStatus, requestElevation };
