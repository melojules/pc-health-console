import { useEffect, useRef, useState } from 'react';
import Card from '../components/Card';
import StatCard from '../components/StatCard';
import InsightRow from '../components/InsightRow';
import Button from '../components/Button';
import { cssTextToStyle } from '../cssText';

function useLoadHistory() {
  const [cpuHistory, setCpuHistory] = useState([]);
  const [ramHistory, setRamHistory] = useState([]);
  const [load, setLoad] = useState(null);

  useEffect(() => {
    let stopped = false;
    async function poll() {
      const l = await window.electronAPI.getLoad().catch(() => null);
      if (stopped || !l) return;
      setLoad(l);
      setCpuHistory((h) => [...h.slice(-4), l.cpuPercent]);
      setRamHistory((h) => [...h.slice(-4), l.memUsedPercent]);
    }
    poll();
    const id = setInterval(poll, 2600);
    return () => { stopped = true; clearInterval(id); };
  }, []);

  return { load, cpuHistory, ramHistory };
}

export default function Overview({ refreshTick, onNavigate }) {
  const [info, setInfo] = useState(null);
  const [drives, setDrives] = useState(null);
  const [driverSummary, setDriverSummary] = useState(null);
  const [reclaimableBytes, setReclaimableBytes] = useState(null);
  const [loading, setLoading] = useState(true);
  const { load, cpuHistory, ramHistory } = useLoadHistory();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      window.electronAPI.getSystemInfo(),
      window.electronAPI.getDrives(),
      window.electronAPI.scanDrivers(),
      window.electronAPI.scanCleanupCategories(),
    ]).then(([sysInfo, driveList, driverList, cleanupCats]) => {
      if (cancelled) return;
      setInfo(sysInfo);
      setDrives(driveList);
      const outdated = driverList.filter((d) => d.status === 'Outdated').length;
      const missing = driverList.filter((d) => d.status === 'Missing').length;
      const unsigned = driverList.filter((d) => d.status === 'Unsigned').length;
      setDriverSummary({ outdated, missing, unsigned, total: outdated + missing + unsigned });
      setReclaimableBytes(cleanupCats.filter((c) => !c.permanent).reduce((a, c) => a + c.sizeBytes, 0));
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, [refreshTick]);

  if (loading || !info || !drives || !driverSummary) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Reading real system data…</div>;
  }

  const fullestDrive = [...drives].sort((a, b) => b.usedPercent - a.usedPercent)[0];
  const reclaimableGB = reclaimableBytes != null ? Math.round((reclaimableBytes / 1024 ** 3) * 10) / 10 : 0;
  const issues = driverSummary.total + (fullestDrive?.usedPercent >= 90 ? 1 : 0);
  const healthScore = Math.max(5, 100 - issues * 9);

  return (
    <div style={{ display: 'grid', gap: 'var(--gap-grid)' }}>
      <InsightRow
        tone="dark"
        title={`${issues} issue${issues === 1 ? '' : 's'} found`}
        description={`${driverSummary.outdated} outdated driver${driverSummary.outdated === 1 ? '' : 's'} · ${driverSummary.missing} missing device${driverSummary.missing === 1 ? '' : 's'} · ${reclaimableGB} GB reclaimable`}
        value={healthScore}
        ringLabel={healthScore}
        action={<Button variant="onDark" size="sm" onClick={() => onNavigate('drivers')}>Run Full Scan</Button>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--gap-grid)' }}>
        <StatCard
          label="CPU Usage" value={load?.cpuPercent ?? '—'} unit="%"
          spark={cpuHistory.length ? cpuHistory : [load?.cpuPercent ?? 0]}
        />
        <StatCard
          label="Memory in Use" value={load?.memUsedGB ?? '—'} unit="GB"
          spark={ramHistory.length ? ramHistory : [load?.memUsedPercent ?? 0]}
        />
        <StatCard label="Reclaimable Space" value={reclaimableGB} unit="GB" spark={[reclaimableGB > 0 ? 60 : 10]} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--gap-grid)' }}>
        <Card padding="var(--pad-card-lg)">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: 16 }}>
            <div style={{ font: 'var(--type-card-title)', color: 'var(--text-heading)' }}>Device Specification</div>
            <div style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-faint)' }}>Read from this PC just now</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 28px' }}>
            {info.specs.map((spec) => (
              <div key={spec.label} style={{ display: 'grid', gap: 3, paddingBottom: 12, borderBottom: '1px solid var(--border-hairline)' }}>
                <div style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-faint)', letterSpacing: 'var(--ls-overline)', textTransform: 'uppercase' }}>{spec.label}</div>
                <div style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-heading)', fontWeight: 'var(--fw-medium)' }}>{spec.value}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="var(--pad-card-lg)">
          <div style={{ font: 'var(--type-card-title)', color: 'var(--text-heading)', marginBottom: 18 }}>Storage Drives</div>
          <div style={{ display: 'grid', gap: 18 }}>
            {drives.map((drive) => (
              <div key={drive.name} style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
                  <span style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-heading)', fontWeight: 'var(--fw-medium)' }}>{drive.name}</span>
                  <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-faint)' }}>{drive.free} free of {drive.size}</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
                  <div style={cssTextToStyle(drive.barStyle)} />
                </div>
                <div style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-faint)' }}>{drive.note}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--gap-grid)' }}>
        {fullestDrive && (
          <InsightRow
            tone="light"
            title={`Drive ${fullestDrive.name} is ${fullestDrive.usedPercent}% full`}
            description={fullestDrive.usedPercent >= 90 ? 'Free space is below the 10% Windows needs for paging' : 'Healthy — no action needed'}
            value={fullestDrive.usedPercent}
            ringLabel={`${fullestDrive.usedPercent}%`}
            action={<Button variant="outline" size="sm" onClick={() => onNavigate('cleanup')}>Open Cleanup</Button>}
          />
        )}
        {driverSummary.total > 0 && (
          <InsightRow
            tone="light"
            title={`${driverSummary.total} driver${driverSummary.total === 1 ? '' : 's'} flagged`}
            description="Outdated, missing or unsigned — reviewed, not auto-installed"
            value={Math.min(100, driverSummary.total * 15)}
            ringLabel={String(driverSummary.total)}
            action={<Button variant="outline" size="sm" onClick={() => onNavigate('drivers')}>Review Drivers</Button>}
          />
        )}
      </div>
    </div>
  );
}
