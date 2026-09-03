const si = require('systeminformation');
const os = require('os');

function gb(bytes) {
  return Math.round((bytes / 1024 ** 3) * 10) / 10;
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days} day${days === 1 ? '' : 's'} ${hours} hour${hours === 1 ? '' : 's'}`;
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours} hour${hours === 1 ? '' : 's'} ${minutes} minute${minutes === 1 ? '' : 's'}`;
}

/** One-shot real specs for the Overview screen's "Device Specification" card. */
async function getSystemInfo() {
  const [cpu, mem, osInfo, graphics, baseboard, time] = await Promise.all([
    si.cpu(),
    si.mem(),
    si.osInfo(),
    si.graphics(),
    si.baseboard(),
    si.time(),
  ]);

  const gpu = graphics.controllers?.[0];
  const usedSlots = mem.slots ? undefined : undefined; // physical slot count needs memLayout()
  const memLayout = await si.memLayout().catch(() => []);
  const populatedSlots = memLayout.filter((m) => m.size > 0).length;
  const totalSlots = memLayout.length || undefined;

  return {
    specs: [
      {
        label: 'Processor',
        value: `${cpu.manufacturer} ${cpu.brand} · ${cpu.physicalCores}C/${cpu.cores}T · ${cpu.speed} GHz`,
      },
      {
        label: 'Graphics',
        value: gpu ? `${gpu.vendor ? gpu.vendor + ' ' : ''}${gpu.model}${gpu.vram ? ' · ' + gb(gpu.vram * 1024 * 1024) + ' GB' : ''}` : 'Not detected',
      },
      {
        label: 'Memory',
        value: `${gb(mem.total)} GB${memLayout[0]?.type ? ' ' + memLayout[0].type : ''}${memLayout[0]?.clockSpeed ? '-' + memLayout[0].clockSpeed : ''}${totalSlots ? ` · ${populatedSlots} of ${totalSlots} slots used` : ''}`,
      },
      {
        label: 'Operating System',
        value: `${osInfo.distro} · ${osInfo.release} build ${osInfo.build || osInfo.kernel}`,
      },
      {
        label: 'Motherboard',
        value: `${baseboard.manufacturer || ''} ${baseboard.model || ''}`.trim() || 'Unknown',
      },
      {
        label: 'Uptime',
        value: `${formatUptime(time.uptime)} · last restart ${new Date(Date.now() - time.uptime * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`,
      },
    ],
    raw: {
      cpuModel: `${cpu.manufacturer} ${cpu.brand}`,
      memoryTotalGB: gb(mem.total),
      osDistro: osInfo.distro,
      uptimeSeconds: time.uptime,
      hostname: osInfo.hostname || os.hostname(),
    },
  };
}

/** Polled real load for the CPU/RAM stat cards. */
async function getLoad() {
  const [load, mem] = await Promise.all([si.currentLoad(), si.mem()]);
  return {
    cpuPercent: Math.round(load.currentLoad),
    memUsedGB: gb(mem.active),
    memTotalGB: gb(mem.total),
    memUsedPercent: Math.round((mem.active / mem.total) * 100),
  };
}

module.exports = { getSystemInfo, getLoad };
