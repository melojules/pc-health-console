const { shell } = require('electron');
const { runPowerShellJson } = require('../powershell');

const OUTDATED_THRESHOLD_MONTHS = 18;

// Real installed-hardware enumeration. Win32_PnPSignedDriver only lists devices that
// *have* a driver record, so devices with no driver at all (ConfigManagerErrorCode 28)
// are found separately via Get-PnpDevice and unioned in.
const SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
$signed = Get-CimInstance Win32_PnPSignedDriver | Where-Object { $_.DeviceName } |
  Select-Object DeviceName, DeviceClass, Manufacturer, DriverVersion, DriverDate, IsSigned, DeviceID
$pnp = Get-PnpDevice | Select-Object InstanceId, FriendlyName, Class, ConfigManagerErrorCode

$rows = New-Object System.Collections.ArrayList
foreach ($d in $signed) {
  $dev = $pnp | Where-Object { $_.InstanceId -eq $d.DeviceID } | Select-Object -First 1
  # ConvertTo-Json doesn't reliably ISO-format [DateTime] — format explicitly so the
  # renderer's JS Date parser parses it instead of getting "Invalid Date".
  $dateIso = if ($d.DriverDate) { $d.DriverDate.ToString('o') } else { $null }
  [void]$rows.Add([PSCustomObject]@{
    id = $d.DeviceID
    name = $d.DeviceName
    category = $d.DeviceClass
    manufacturer = $d.Manufacturer
    version = $d.DriverVersion
    date = $dateIso
    signed = [bool]$d.IsSigned
    errorCode = if ($dev) { [int]$dev.ConfigManagerErrorCode } else { 0 }
  })
}

$signedIds = $signed | ForEach-Object { $_.DeviceID }
$missing = $pnp | Where-Object { $_.ConfigManagerErrorCode -eq 28 -and ($signedIds -notcontains $_.InstanceId) -and $_.FriendlyName }
foreach ($m in $missing) {
  [void]$rows.Add([PSCustomObject]@{
    id = $m.InstanceId
    name = $m.FriendlyName
    category = $m.Class
    manufacturer = $null
    version = $null
    date = $null
    signed = $false
    errorCode = 28
  })
}

$rows | ConvertTo-Json -Depth 4 -Compress
`;

// Third-party vendors only — these are the only cases where "check the vendor
// site for a newer version" is a real, actionable step.
const THIRD_PARTY_VENDOR_URLS = [
  [/nvidia/i, 'https://www.nvidia.com/Download/index.aspx'],
  [/(^|\s)amd($|\s)|advanced micro devices/i, 'https://www.amd.com/en/support'],
  [/intel/i, 'https://www.intel.com/content/www/us/en/support/detect.html'],
  [/realtek/i, 'https://www.realtek.com/en/downloads'],
  [/synaptics/i, 'https://www.synaptics.com/products/support'],
  [/qualcomm|atheros/i, 'https://www.qualcomm.com/support'],
  [/broadcom/i, 'https://www.broadcom.com/support'],
];
// Microsoft-authored inbox class/bus drivers (keyboard, USB hub, Bluetooth
// stack, generic NIC miniports, etc.) commonly carry a placeholder date
// (often 2006-06-21) and have no independent update path — they get a
// reference link but never drive an "Outdated" verdict on date alone.
const MICROSOFT_CATALOG_URL = 'https://www.catalog.update.microsoft.com/';

function vendorUrlFor(manufacturer, name) {
  const haystack = `${manufacturer || ''} ${name || ''}`;
  for (const [re, url] of THIRD_PARTY_VENDOR_URLS) {
    if (re.test(haystack)) return { url, thirdParty: true };
  }
  if (/microsoft/i.test(haystack)) return { url: MICROSOFT_CATALOG_URL, thirdParty: false };
  return { url: null, thirdParty: false };
}

function classify(row, hasThirdPartyVendor) {
  if (row.errorCode === 28) return 'Missing';
  if (row.signed === false) return 'Unsigned';
  if (row.date && hasThirdPartyVendor) {
    const ageMonths = (Date.now() - new Date(row.date).getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (ageMonths > OUTDATED_THRESHOLD_MONTHS) return 'Outdated';
  }
  return 'Up to date';
}

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Windows enumerates hundreds of virtual/logical pseudo-devices (print queue
// stubs, audio endpoints, WAN miniports, bus enumerators, per-core CPU nodes)
// that have "drivers" in the WMI sense but aren't anything a person would
// ever update — an unfiltered list is 1000+ rows of noise. Restrict to
// device classes that map to real, updatable hardware.
const RELEVANT_CLASSES = new Set([
  'DISPLAY', 'NET', 'MEDIA', 'HDC', 'SCSIADAPTER', 'DISKDRIVE', 'USB',
  'BLUETOOTH', 'MOUSE', 'KEYBOARD', 'MONITOR', 'PRINTER', 'IMAGE', 'BATTERY', 'PROCESSOR',
]);

async function scanDrivers() {
  const rows = await runPowerShellJson(SCRIPT, { asArray: true, timeoutMs: 30000 });

  const seen = new Set();
  const deduped = rows.filter((r) => {
    if (!r.name) return false;
    if (!RELEVANT_CLASSES.has((r.category || '').toUpperCase())) return false;
    const key = `${r.name}|${r.category}|${r.version || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped
    .map((r) => {
      const { url: vendorUrl, thirdParty } = vendorUrlFor(r.manufacturer, r.name);
      const status = classify(r, thirdParty);
      const dateLabel = formatDate(r.date);
      let availableLabel;
      if (status === 'Missing') availableLabel = 'driver not installed';
      else if (status === 'Unsigned') availableLabel = 'unsigned driver — verify before trusting';
      else if (status === 'Outdated') availableLabel = dateLabel ? `driver dated ${dateLabel} — check vendor site` : 'driver may be outdated — check vendor site';
      else availableLabel = dateLabel ? `up to date · installed ${dateLabel}` : 'up to date';

      return {
        id: r.id,
        name: r.name,
        category: r.category || 'Unknown',
        installed: r.version || '—',
        status,
        availableLabel,
        vendorUrl,
        showVendorLink: status !== 'Up to date' && !!vendorUrl,
      };
    })
    .sort((a, b) => {
      const order = { Missing: 0, Outdated: 1, Unsigned: 2, 'Up to date': 3 };
      return order[a.status] - order[b.status];
    });
}

async function openVendorPage(url) {
  if (!url) return { ok: false, error: 'No vendor URL for this device' };
  await shell.openExternal(url);
  return { ok: true };
}

module.exports = { scanDrivers, openVendorPage, OUTDATED_THRESHOLD_MONTHS };
