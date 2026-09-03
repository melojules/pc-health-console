const si = require('systeminformation');

function gb(bytes) {
  const v = bytes / 1024 ** 3;
  return v >= 100 ? `${Math.round(v)} GB` : `${Math.round(v * 10) / 10} GB`;
}

function tb(bytes) {
  const v = bytes / 1024 ** 4;
  if (v >= 1) return `${Math.round(v * 100) / 100} TB`;
  return gb(bytes);
}

/** Real mounted volumes with real free/used space, for the Overview "Storage Drives" card. */
async function getDrives() {
  const volumes = await si.fsSize();
  const real = volumes.filter((v) => v.size > 0 && v.mount);

  return real.map((v) => {
    const usedPct = Math.round(v.use);
    let note;
    if (usedPct >= 90) note = `${usedPct}% full — Windows pages heavily below 10% free`;
    else if (usedPct >= 75) note = `${usedPct}% full — getting tight`;
    else note = `${usedPct}% full — healthy`;

    const isRemovable = /removable/i.test(v.physical || '') || /^[D-Z]:/i.test(v.mount) && v.type?.toLowerCase().includes('removable');

    return {
      name: `${v.mount} ${v.fs || ''}`.trim(),
      size: tb(v.size),
      free: gb(v.size - v.used),
      usedPercent: usedPct,
      note: isRemovable ? 'Removable — excluded from scans' : note,
      barStyle: `height:100%;width:${Math.max(2, usedPct)}%;border-radius:999px;background:${usedPct >= 90 ? 'var(--coral-400)' : 'var(--accent)'};transition:width var(--dur-chart) var(--ease-out);`,
    };
  });
}

module.exports = { getDrives };
