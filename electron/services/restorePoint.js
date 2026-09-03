const { runPowerShellJson } = require('../powershell');

// Checkpoint-Computer doesn't error when Windows' one-per-24h throttle blocks
// it — it just silently no-ops. We detect that by comparing the restore point
// list's latest sequence number before/after, so the caller gets an honest
// "throttled" result instead of a false "done".
const SCRIPT = `
$ErrorActionPreference = 'Stop'
try {
  $before = @(Get-ComputerRestorePoint -ErrorAction SilentlyContinue)
  $beforeLatest = if ($before.Count -gt 0) { ($before | Sort-Object SequenceNumber -Descending | Select-Object -First 1).SequenceNumber } else { -1 }
  Checkpoint-Computer -Description $env:PHC_DESC -RestorePointType 'MODIFY_SETTINGS'
  Start-Sleep -Milliseconds 700
  $after = @(Get-ComputerRestorePoint -ErrorAction SilentlyContinue)
  $afterLatest = if ($after.Count -gt 0) { ($after | Sort-Object SequenceNumber -Descending | Select-Object -First 1).SequenceNumber } else { -1 }
  @{ ok = $true; created = ($afterLatest -gt $beforeLatest) } | ConvertTo-Json -Compress
} catch {
  @{ ok = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress
}
`;

async function createRestorePoint(description) {
  const r = await runPowerShellJson(SCRIPT, {
    env: { PHC_DESC: description || 'PC Health Console checkpoint' },
    timeoutMs: 60000,
  }).catch((e) => ({ ok: false, error: e.message }));

  if (!r?.ok) return { ok: false, error: r?.error || 'Unknown error', throttled: false };
  if (!r.created) {
    return {
      ok: true,
      throttled: true,
      message: 'Windows only allows one restore point per 24 hours — a recent one already exists, so no new checkpoint was created.',
    };
  }
  return { ok: true, throttled: false };
}

module.exports = { createRestorePoint };
