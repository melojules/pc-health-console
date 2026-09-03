const { runPowerShell, runPowerShellJson } = require('../powershell');

// Real enumeration of registry Run keys (HKCU, HKLM, HKLM Wow6432Node) and the
// Startup folder, with real enabled/disabled state read from the same
// StartupApproved registry values Task Manager itself uses.
//
// Note: Task Manager's "High/Medium/Low impact" figure comes from private boot
// telemetry Windows records internally and has no supported public API — rather
// than inventing a fake number here (the mistake this whole rebuild is fixing),
// this screen shows real name/publisher/enabled state/source instead and omits
// a fabricated impact rating.
const LIST_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
function Get-ApprovedState($approvedPath, $name) {
  $val = Get-ItemProperty -Path $approvedPath -Name $name -ErrorAction SilentlyContinue
  if (-not $val) { return $true }
  $bytes = $val.$name
  if ($bytes -and $bytes.Length -gt 0) { return ($bytes[0] -eq 2) }
  return $true
}

$items = New-Object System.Collections.ArrayList
$approvedRun = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run'
$approvedFolder = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\StartupFolder'

$runKeys = @(
  @{Hive='HKCU'; Path='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'},
  @{Hive='HKLM'; Path='HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'},
  @{Hive='HKLM32'; Path='HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run'}
)
foreach ($rk in $runKeys) {
  if (Test-Path $rk.Path) {
    $props = Get-ItemProperty -Path $rk.Path
    $props.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' } | ForEach-Object {
      $name = $_.Name
      $cmd = [string]$_.Value
      $enabled = Get-ApprovedState $approvedRun $name
      $exePath = ($cmd -replace '^"([^"]+)".*$', '$1')
      $company = $null
      try { if ($exePath -and (Test-Path $exePath)) { $company = (Get-Item $exePath).VersionInfo.CompanyName } } catch {}
      [void]$items.Add([PSCustomObject]@{
        id = "run|$($rk.Hive)|$name"
        name = $name
        publisher = $company
        command = $cmd
        enabled = $enabled
        source = 'registry'
      })
    }
  }
}

$folders = @("$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs\\Startup", "$env:ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Startup")
foreach ($f in $folders) {
  if (Test-Path $f) {
    Get-ChildItem -Path $f -Filter *.lnk -ErrorAction SilentlyContinue | ForEach-Object {
      $name = $_.BaseName
      $enabled = Get-ApprovedState $approvedFolder $name
      $company = $null
      try {
        $sh = New-Object -ComObject WScript.Shell
        $target = $sh.CreateShortcut($_.FullName).TargetPath
        if ($target -and (Test-Path $target)) { $company = (Get-Item $target).VersionInfo.CompanyName }
      } catch {}
      [void]$items.Add([PSCustomObject]@{
        id = "folder||$name"
        name = $name
        publisher = $company
        command = $_.FullName
        enabled = $enabled
        source = 'startupFolder'
      })
    }
  }
}

$items | ConvertTo-Json -Depth 4 -Compress
`;

// Toggles the same StartupApproved binary flag Task Manager writes:
// byte 0 = 0x02 (enabled) or 0x03 (disabled); remaining bytes preserved if present.
const TOGGLE_SCRIPT = `
$ErrorActionPreference = 'Stop'
$source = $env:PHC_SOURCE
$name = $env:PHC_NAME
$enable = $env:PHC_ENABLE -eq '1'
$approvedPath = if ($source -eq 'startupFolder') {
  'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\StartupFolder'
} else {
  'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run'
}
if (-not (Test-Path $approvedPath)) { New-Item -Path $approvedPath -Force | Out-Null }
$existing = (Get-ItemProperty -Path $approvedPath -Name $name -ErrorAction SilentlyContinue).$name
$bytes = if ($existing -and $existing.Length -eq 12) { $existing } else { New-Object byte[] 12 }
$bytes[0] = if ($enable) { 2 } else { 3 }
Set-ItemProperty -Path $approvedPath -Name $name -Value $bytes -Type Binary
'{"ok":true}'
`;

async function getStartupItems() {
  const rows = await runPowerShellJson(LIST_SCRIPT, { asArray: true, timeoutMs: 20000 });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    publisher: r.publisher || 'Unknown publisher',
    enabled: r.enabled,
    source: r.source,
  }));
}

async function toggleStartupItem(id, enable) {
  // id shape: "run|HKCU|SomeName" or "folder||SomeName"
  const [source, , ...nameParts] = id.split('|');
  const name = nameParts.join('|');
  await runPowerShell(TOGGLE_SCRIPT, {
    env: {
      PHC_SOURCE: source === 'folder' ? 'startupFolder' : 'registry',
      PHC_NAME: name,
      PHC_ENABLE: enable ? '1' : '0',
    },
    timeoutMs: 10000,
  });
  return { ok: true };
}

module.exports = { getStartupItems, toggleStartupItem };
