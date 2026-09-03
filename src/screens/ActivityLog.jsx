import { useEffect, useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import { pill } from '../pill';

function formatTime(iso) {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today ${time}`;
  return `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ${time}`;
}

export default function ActivityLog() {
  const [entries, setEntries] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    window.electronAPI.getActivityLog().then(setEntries);
    const unsubscribe = window.electronAPI.onActivityUpdate((fresh) => setEntries(fresh));
    return unsubscribe;
  }, []);

  if (!entries) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading activity log…</div>;
  }

  const rollback = async (id) => {
    setBusyId(id);
    await window.electronAPI.rollbackActivity(id);
    setBusyId(null);
  };

  return (
    <div style={{ display: 'grid', gap: 'var(--gap-grid)' }}>
      <Card tone="mint" padding="var(--pad-card)">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <span style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-heading)', flex: 1 }}>
            This is a real, persisted log of every change this app has actually made on this PC. Reversible changes can be rolled back below.
          </span>
        </div>
      </Card>

      <Card padding="0">
        {entries.length === 0 && (
          <div style={{ padding: 24, fontSize: 'var(--fs-body-sm)', color: 'var(--text-faint)', textAlign: 'center' }}>
            No actions yet — this fills in as you use Drivers, Performance and Cleanup.
          </div>
        )}
        {entries.map((e) => (
          <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 120px 120px', gap: 'var(--space-4)', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid var(--border-hairline)' }}>
            <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-faint)' }}>{formatTime(e.time)}</span>
            <div style={{ display: 'grid', gap: 2 }}>
              <span style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-heading)', fontWeight: 'var(--fw-medium)' }}>{e.action}</span>
              <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-faint)' }}>{e.detail}</span>
            </div>
            <span style={e.result === 'Complete' ? pill('var(--green-50)', 'var(--green-600)') : pill('var(--surface-hover)', 'var(--text-muted)')}>
              {e.rolledBack ? 'Rolled back' : e.result}
            </span>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              {e.rollback && !e.rolledBack && (
                <Button variant="outline" size="sm" disabled={busyId === e.id} onClick={() => rollback(e.id)}>
                  Roll Back
                </Button>
              )}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
