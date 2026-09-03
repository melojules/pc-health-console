import { useEffect, useState } from 'react';
import Card from '../components/Card';
import InsightRow from '../components/InsightRow';
import Button from '../components/Button';
import { pill } from '../pill';

function formatDuration(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function Performance({ refreshTick, isAdmin }) {
  const [bootTime, setBootTime] = useState(null);
  const [diskHealth, setDiskHealth] = useState(null);
  const [startupItems, setStartupItems] = useState(null);
  const [idleServices, setIdleServices] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      window.electronAPI.getBootTime(),
      window.electronAPI.getDiskHealth(),
      window.electronAPI.getStartupItems(),
      window.electronAPI.getIdleServices(),
    ]).then(([bt, dh, si, idle]) => {
      setBootTime(bt); setDiskHealth(dh); setStartupItems(si); setIdleServices(idle); setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(load, [refreshTick]);

  if (loading || !bootTime || !diskHealth || !startupItems || !idleServices) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Reading boot, disk and startup data…</div>;
  }

  const enabledStartups = startupItems.filter((s) => s.enabled);
  const worstDisk = diskHealth.disks.find((d) => d.health && d.health !== 'Healthy') || diskHealth.disks[0];

  const toggleStartup = async (item) => {
    setBusyId(item.id);
    await window.electronAPI.toggleStartupItem(item.id, !item.enabled);
    const fresh = await window.electronAPI.getStartupItems();
    setStartupItems(fresh);
    setBusyId(null);
  };

  const setServiceManual = async (svc) => {
    setBusyId(svc.name);
    await window.electronAPI.setServiceStartupType(svc.name, 'Manual');
    const fresh = await window.electronAPI.getIdleServices();
    setIdleServices(fresh);
    setBusyId(null);
  };

  return (
    <div style={{ display: 'grid', gap: 'var(--gap-grid)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--gap-grid)' }}>
        <Card padding="var(--pad-card-lg)">
          <div style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-muted)', marginBottom: 6 }}>System Uptime</div>
          <div style={{ font: 'var(--type-metric)', color: 'var(--text-heading)' }}>{formatDuration(bootTime.uptimeSeconds || 0)}</div>
          <div style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-faint)', marginTop: 6 }}>
            {bootTime.bootDurationAvailable ? `Last boot took ${Math.round(bootTime.bootDurationMs / 1000)}s` : 'Boot-duration breakdown unavailable on this system'}
          </div>
        </Card>
        <Card padding="var(--pad-card-lg)">
          <div style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-muted)', marginBottom: 6 }}>Startup Programs</div>
          <div style={{ font: 'var(--type-metric)', color: 'var(--text-heading)' }}>{enabledStartups.length}</div>
          <div style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-faint)', marginTop: 6 }}>enabled at sign-in, of {startupItems.length} found</div>
        </Card>
        <Card padding="var(--pad-card-lg)">
          <div style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-muted)', marginBottom: 6 }}>Disk Health</div>
          <div style={{ font: 'var(--type-metric)', color: 'var(--text-heading)' }}>
            {diskHealth.available ? (worstDisk?.health || 'Unknown') : 'Unavailable'}
          </div>
          <div style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-faint)', marginTop: 6 }}>
            {diskHealth.available
              ? (worstDisk?.reliabilityAvailable ? `${worstDisk.wearPercent != null ? worstDisk.wearPercent + '% wear · ' : ''}${worstDisk.temperatureC != null ? worstDisk.temperatureC + '°C' : ''}` : (isAdmin ? 'Reliability counters unavailable on this drive' : 'Sign in as Administrator for wear/temperature'))
              : 'Storage module unavailable on this system'}
          </div>
        </Card>
      </div>

      {(!isAdmin || enabledStartups.length > 0 || idleServices.length > 0) && (
        <>
          <div style={{ font: 'var(--type-card-title)', color: 'var(--text-heading)', paddingTop: 4 }}>Recommendations</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {enabledStartups.length > 3 && (
              <InsightRow
                tone="dark"
                title={`${enabledStartups.length} programs launch at sign-in`}
                description="Disabling ones you rarely use right after login can shorten boot time"
                value={Math.min(100, enabledStartups.length * 12)}
                ringLabel={String(enabledStartups.length)}
              />
            )}
            {idleServices.length > 0 && (
              <InsightRow
                tone="light"
                title={`${idleServices.length} idle service${idleServices.length === 1 ? '' : 's'} set to Automatic`}
                description={idleServices.map((s) => s.label).join(', ')}
                value={Math.min(100, idleServices.length * 20)}
                ringLabel={String(idleServices.length)}
              />
            )}
            {worstDisk && worstDisk.health && worstDisk.health !== 'Healthy' && (
              <InsightRow
                tone="light"
                title={`Disk reports "${worstDisk.health}"`}
                description="Back up important files and consider running a full diagnostic"
                value={80}
                ringLabel="!"
                ringColor="var(--coral-500)"
              />
            )}
          </div>
        </>
      )}

      <div style={{ font: 'var(--type-card-title)', color: 'var(--text-heading)', paddingTop: 8 }}>Startup Programs</div>
      <Card padding="0">
        {startupItems.length === 0 && <div style={{ padding: 20, fontSize: 'var(--fs-body-sm)', color: 'var(--text-faint)' }}>No registry or Startup-folder entries found.</div>}
        {startupItems.map((s) => (
          <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 140px 120px', gap: 'var(--space-4)', alignItems: 'center', padding: '13px 20px', borderBottom: '1px solid var(--border-hairline)' }}>
            <div style={{ display: 'grid', gap: 2 }}>
              <span style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-heading)', fontWeight: 'var(--fw-medium)' }}>{s.name}</span>
              <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-faint)' }}>{s.publisher} · {s.source === 'startupFolder' ? 'Startup folder' : 'Registry'}</span>
            </div>
            <span style={s.enabled ? pill('var(--green-50)', 'var(--green-600)') : pill('var(--surface-hover)', 'var(--text-muted)')}>{s.enabled ? 'Enabled' : 'Disabled'}</span>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant={s.enabled ? 'outline' : 'ghost'} size="sm" disabled={busyId === s.id} onClick={() => toggleStartup(s)}>
                {s.enabled ? 'Disable' : 'Enable'}
              </Button>
            </div>
          </div>
        ))}
      </Card>

      {idleServices.length > 0 && (
        <>
          <div style={{ font: 'var(--type-card-title)', color: 'var(--text-heading)', paddingTop: 8 }}>Idle Services</div>
          <Card padding="0">
            {idleServices.map((svc) => (
              <div key={svc.name} style={{ display: 'grid', gridTemplateColumns: '1.4fr 140px 120px', gap: 'var(--space-4)', alignItems: 'center', padding: '13px 20px', borderBottom: '1px solid var(--border-hairline)' }}>
                <span style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-heading)', fontWeight: 'var(--fw-medium)' }}>{svc.label}</span>
                <span style={pill('#FDF3E0', '#8A6318')}>{svc.startType}</span>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="outline" size="sm" disabled={!isAdmin || busyId === svc.name} onClick={() => setServiceManual(svc)}>
                    Set Manual
                  </Button>
                </div>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
