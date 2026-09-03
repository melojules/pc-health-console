import { useEffect, useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Checkbox from '../components/Checkbox';
import Dialog from '../components/Dialog';
import { pill } from '../pill';
import { cssTextToStyle } from '../cssText';

export default function Cleanup({ refreshTick }) {
  const [categories, setCategories] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [restorePointFirst, setRestorePointFirst] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const load = () => {
    setLoading(true);
    window.electronAPI.scanCleanupCategories().then((cats) => {
      setCategories(cats);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(load, [refreshTick]);

  if (loading || !categories) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Scanning real temp, cache, log and update folders…</div>;
  }

  const maxSize = Math.max(1, ...categories.map((c) => c.sizeBytes));
  const selectedCats = categories.filter((c) => selected[c.id]);
  const totalBytes = selectedCats.reduce((a, c) => a + c.sizeBytes, 0);
  const totalLabel = totalBytes >= 1024 ** 3 ? `${Math.round((totalBytes / 1024 ** 3) * 10) / 10} GB` : `${Math.round(totalBytes / 1024 ** 2)} MB`;
  const hasPermanent = selectedCats.some((c) => c.permanent);

  const toggle = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const selectSafeOnly = () => {
    const next = {};
    categories.forEach((c) => { if (c.tag === 'Safe') next[c.id] = true; });
    setSelected(next);
  };

  const confirmDelete = async () => {
    setConfirming(false);
    setDeleting(true);
    const results = await window.electronAPI.deleteCleanupSelection(selectedCats.map((c) => c.id), restorePointFirst);
    setLastResult(results);
    setSelected({});
    setDeleting(false);
    load();
  };

  return (
    <div style={{ display: 'grid', gap: 'var(--gap-grid)' }}>
      <Card tone="green" padding="var(--pad-card-lg)">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-7)' }}>
          <div style={{ display: 'grid', gap: 4, flex: 1 }}>
            <div style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-on-dark-muted)' }}>Selected for deletion</div>
            <div style={{ font: 'var(--type-metric-hero)', color: 'var(--text-on-dark)', letterSpacing: 'var(--ls-tight)' }}>{totalLabel}</div>
            <div style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-on-dark-muted)' }}>
              {selectedCats.length} of {categories.length} categories · reviewed before deletion
              {hasPermanent ? ' · includes a permanent action (Recycle Bin)' : ' · reversible via Recycle Bin'}
            </div>
          </div>
          <Button variant="onDark" size="md" onClick={selectSafeOnly}>Select Safe Only</Button>
          <Button variant="accent" size="md" disabled={selectedCats.length === 0 || deleting} onClick={() => setConfirming(true)}>
            {deleting ? 'Deleting…' : 'Review & Delete'}
          </Button>
        </div>
      </Card>

      {categories.map((c) => {
        const on = !!selected[c.id];
        return (
          <Card key={c.id} padding="var(--pad-card)">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
              <Checkbox checked={on} onChange={() => toggle(c.id)} />
              <div style={{ display: 'grid', gap: 3, flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span style={{ fontSize: 'var(--fs-h3)', color: 'var(--text-heading)', fontWeight: 'var(--fw-medium)' }}>{c.name}</span>
                  <span style={c.tag === 'Safe' ? pill('var(--green-50)', 'var(--green-600)') : pill('#FDF3E0', '#8A6318')}>{c.tag}</span>
                  {c.permanent && <span style={pill('var(--coral-100)', 'var(--coral-600)')}>Permanent</span>}
                </div>
                <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-faint)' }}>{c.note}</span>
                <div style={{ height: 6, borderRadius: 999, background: 'var(--track)', overflow: 'hidden', maxWidth: 420, marginTop: 4 }}>
                  <div style={cssTextToStyle(`height:100%;border-radius:999px;background:${on ? 'var(--accent)' : 'var(--ink-300)'};width:${Math.max(4, Math.round((c.sizeBytes / maxSize) * 100))}%;transition:width var(--dur-chart) var(--ease-out);`)} />
                </div>
              </div>
              <div style={{ display: 'grid', gap: 2, textAlign: 'right' }}>
                <span style={{ font: 'var(--type-metric)', fontSize: 'var(--fs-metric-md)', color: 'var(--text-heading)' }}>{c.sizeLabel}</span>
                <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-faint)' }}>{c.countLabel}</span>
              </div>
            </div>
          </Card>
        );
      })}

      {lastResult && (
        <div style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-faint)', padding: '0 4px' }}>
          Last run: {Object.entries(lastResult).map(([id, r]) => `${id} ${r.ok ? 'done' : 'failed'}`).join(' · ')}
        </div>
      )}

      {confirming && (
        <Dialog
          title={`Delete ${totalLabel} from ${selectedCats.length} categor${selectedCats.length === 1 ? 'y' : 'ies'}?`}
          body={hasPermanent
            ? 'Most selected items move to the Recycle Bin and can be restored. Recycle Bin contents in this selection are removed permanently.'
            : 'Selected files move to the Recycle Bin and can be restored from there if needed.'}
          lines={selectedCats.map((c) => ({ label: c.name, value: c.sizeLabel }))}
          restore
          restoreChecked={restorePointFirst}
          onToggleRestore={() => setRestorePointFirst((v) => !v)}
          confirmLabel="Delete Files"
          confirmVariant="primary"
          onCancel={() => setConfirming(false)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
