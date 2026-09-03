import { useEffect, useState } from 'react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { STATUS_PILL } from '../pill';

export default function Drivers({ refreshTick, scanTick }) {
  const [drivers, setDrivers] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    window.electronAPI.scanDrivers().then((rows) => {
      if (!cancelled) { setDrivers(rows); setLoading(false); }
    }).catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, [refreshTick, scanTick]);

  if (loading || !drivers) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Enumerating installed devices via WMI…</div>;
  }

  const outdated = drivers.filter((d) => d.status === 'Outdated').length;
  const missing = drivers.filter((d) => d.status === 'Missing').length;
  const unsigned = drivers.filter((d) => d.status === 'Unsigned').length;

  return (
    <div style={{ display: 'grid', gap: 'var(--gap-grid)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <Badge tone="mint">{outdated} outdated</Badge>
        <Badge tone="outline">{missing} missing</Badge>
        <Badge tone="outline">{unsigned} unsigned</Badge>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-faint)' }}>{drivers.length} devices enumerated</span>
      </div>

      <Card padding="0">
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.2fr 130px 160px', gap: 'var(--space-4)', alignItems: 'center', padding: '14px 20px', background: 'var(--surface-subtle)', fontSize: 'var(--fs-caption)', color: 'var(--text-faint)', letterSpacing: 'var(--ls-overline)', textTransform: 'uppercase' }}>
          <span>Device</span><span>Driver</span><span>Status</span><span></span>
        </div>
        {drivers.map((d) => (
          <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.2fr 130px 160px', gap: 'var(--space-4)', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid var(--border-hairline)' }}>
            <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-heading)', fontWeight: 'var(--fw-medium)' }}>{d.name}</span>
              <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-faint)' }}>{d.category}</span>
            </div>
            <div style={{ display: 'grid', gap: 2 }}>
              <span style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-body)' }}>{d.installed}</span>
              <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-faint)' }}>{d.availableLabel}</span>
            </div>
            <div><span style={STATUS_PILL[d.status]}>{d.status}</span></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              {d.showVendorLink && (
                <Button variant="ghost" size="sm" onClick={() => window.electronAPI.openVendorPage(d.vendorUrl)}>Vendor Page</Button>
              )}
            </div>
          </div>
        ))}
      </Card>

      <div style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-faint)', padding: '0 4px' }}>
        Driver versions and dates are read live from Windows. There's no public feed of manufacturers' latest versions, so nothing is auto-installed — flagged devices link to the real vendor support page instead.
      </div>
    </div>
  );
}
