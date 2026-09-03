const { spawn } = require('child_process');

const DEFAULT_TIMEOUT_MS = 20000;

/**
 * Runs a PowerShell script and returns raw stdout text.
 * Scripts should end with `ConvertTo-Json -Depth n -Compress` when the
 * caller wants structured data back (use runPowerShellJson for that).
 */
function runPowerShell(script, { timeoutMs = DEFAULT_TIMEOUT_MS, env } = {}) {
  return new Promise((resolve, reject) => {
    const ps = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { windowsHide: true, env: env ? { ...process.env, ...env } : process.env }
    );

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      ps.kill();
      reject(new Error(`PowerShell timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    ps.stdout.on('data', (d) => { stdout += d.toString('utf8'); });
    ps.stderr.on('data', (d) => { stderr += d.toString('utf8'); });
    ps.on('error', (err) => { clearTimeout(timer); reject(err); });
    ps.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0 && !stdout.trim()) {
        reject(new Error(stderr.trim() || `PowerShell exited with code ${code}`));
        return;
      }
      resolve(stdout);
    });
  });
}

/**
 * Runs a PowerShell script whose last pipeline output is ConvertTo-Json,
 * and parses the result. `asArray: true` normalizes PowerShell's habit of
 * unwrapping single-element arrays to a bare object.
 */
async function runPowerShellJson(script, opts = {}) {
  const { asArray = false, ...rest } = opts;
  const out = (await runPowerShell(script, rest)).trim();
  if (!out) return asArray ? [] : null;
  let parsed;
  try {
    parsed = JSON.parse(out);
  } catch (e) {
    throw new Error(`Failed to parse PowerShell JSON output: ${e.message}\n${out.slice(0, 500)}`);
  }
  if (asArray) return Array.isArray(parsed) ? parsed : [parsed];
  return parsed;
}

module.exports = { runPowerShell, runPowerShellJson };
