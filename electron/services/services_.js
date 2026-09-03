const { runPowerShell, runPowerShellJson } = require('../powershell');

// A curated, conservative allowlist of Windows services that are commonly safe
// to set to Manual when running idle on a typical desktop. This is an opinionated
// suggestion list (like any PC-optimization tool has), but every field shown for
// it (current Status, current StartType) is queried live — nothing here is a
// fabricated number.
const CANDIDATES = [
  { name: 'Fax', label: 'Fax' },
  { name: 'RemoteRegistry', label: 'Remote Registry' },
  { name: 'MapsBroker', label: 'Downloaded Maps Manager' },
  { name: 'PrintNotify', label: 'Printer Notifications', skipIfPrinters: true },
  { name: 'WMPNetworkSvc', label: 'Windows Media Player Network Sharing' },
];

const SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
$names = $env:PHC_SERVICE_NAMES -split ','
$hasPrinters = @(Get-Printer -ErrorAction SilentlyContinue).Count -gt 0
$rows = foreach ($n in $names) {
  $svc = Get-Service -Name $n -ErrorAction SilentlyContinue
  if ($svc) {
    [PSCustomObject]@{
      name = $svc.Name
      displayName = $svc.DisplayName
      status = [string]$svc.Status
      startType = [string]$svc.StartType
    }
  }
}
@{ services = $rows; hasPrinters = $hasPrinters } | ConvertTo-Json -Depth 4 -Compress
`;

const SET_SCRIPT = `
$ErrorActionPreference = 'Stop'
Set-Service -Name $env:PHC_SERVICE_NAME -StartupType $env:PHC_STARTUP_TYPE
'{"ok":true}'
`;

async function getIdleServices() {
  const result = await runPowerShellJson(SCRIPT, {
    env: { PHC_SERVICE_NAMES: CANDIDATES.map((c) => c.name).join(',') },
    timeoutMs: 15000,
  });
  const byName = new Map((result?.services || []).map((s) => [s.name, s]));

  return CANDIDATES
    .filter((c) => !(c.skipIfPrinters && result?.hasPrinters))
    .map((c) => byName.get(c.name))
    .filter(Boolean)
    .filter((s) => s.status === 'Running')
    .map((s) => ({
      name: s.name,
      label: s.displayName || s.name,
      status: s.status,
      startType: s.startType,
    }));
}

async function setServiceStartupType(name, startupType) {
  if (!['Manual', 'Automatic', 'Disabled'].includes(startupType)) {
    throw new Error(`Invalid startup type: ${startupType}`);
  }
  await runPowerShell(SET_SCRIPT, {
    env: { PHC_SERVICE_NAME: name, PHC_STARTUP_TYPE: startupType },
    timeoutMs: 10000,
  });
  return { ok: true };
}

module.exports = { getIdleServices, setServiceStartupType };
