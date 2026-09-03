const { runPowerShellJson } = require('../powershell');

const DISK_SCRIPT = `
$ErrorActionPreference = 'Stop'
try {
  $disks = Get-PhysicalDisk | Select-Object DeviceId, FriendlyName, MediaType, HealthStatus, OperationalStatus, Size
  $rows = foreach ($d in $disks) {
    $wear = $null; $temp = $null; $readErr = $null; $writeErr = $null
    try {
      $rel = Get-StorageReliabilityCounter -PhysicalDisk (Get-PhysicalDisk -DeviceId $d.DeviceId) -ErrorAction Stop
      $wear = $rel.Wear
      $temp = $rel.Temperature
      $readErr = $rel.ReadErrorsTotal
      $writeErr = $rel.WriteErrorsTotal
    } catch {}
    [PSCustomObject]@{
      id = $d.DeviceId
      name = $d.FriendlyName
      mediaType = [string]$d.MediaType
      health = [string]$d.HealthStatus
      operational = [string]$d.OperationalStatus
      wearPercent = $wear
      temperatureC = $temp
      readErrors = $readErr
      writeErrors = $writeErr
      available = $true
    }
  }
  $rows | ConvertTo-Json -Depth 4 -Compress
} catch {
  '{"available":false}' | Write-Output
}
`;

const BOOT_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
$os = Get-CimInstance Win32_OperatingSystem
$uptimeSeconds = [int](New-TimeSpan -Start $os.LastBootUpTime -End (Get-Date)).TotalSeconds
$lastBoot = $os.LastBootUpTime.ToString('o')

$bootMs = $null
try {
  $evt = Get-WinEvent -LogName 'Microsoft-Windows-Diagnostics-Performance/Operational' -FilterXPath "*[System[EventID=100]]" -MaxEvents 1 -ErrorAction Stop
  $xml = [xml]$evt.ToXml()
  $bootMs = [int]($xml.Event.EventData.Data | Where-Object { $_.Name -eq 'BootTime' } | Select-Object -ExpandProperty '#text')
} catch {}

@{ uptimeSeconds = $uptimeSeconds; lastBoot = $lastBoot; bootDurationMs = $bootMs } | ConvertTo-Json -Compress
`;

async function getDiskHealth() {
  const result = await runPowerShellJson(DISK_SCRIPT, { timeoutMs: 20000 });
  if (!result || result.available === false) {
    return { available: false, disks: [] };
  }
  const disks = Array.isArray(result) ? result : [result];
  return {
    available: true,
    disks: disks.map((d) => ({
      id: d.id,
      name: d.name,
      mediaType: d.mediaType,
      health: d.health,
      wearPercent: d.wearPercent ?? null,
      temperatureC: d.temperatureC ?? null,
      readErrors: d.readErrors ?? null,
      writeErrors: d.writeErrors ?? null,
      reliabilityAvailable: d.wearPercent != null || d.temperatureC != null,
    })),
  };
}

async function getBootTime() {
  const r = await runPowerShellJson(BOOT_SCRIPT, { timeoutMs: 15000 });
  return {
    uptimeSeconds: r?.uptimeSeconds ?? null,
    lastBoot: r?.lastBoot ?? null,
    bootDurationMs: r?.bootDurationMs ?? null,
    bootDurationAvailable: r?.bootDurationMs != null,
  };
}

module.exports = { getDiskHealth, getBootTime };
