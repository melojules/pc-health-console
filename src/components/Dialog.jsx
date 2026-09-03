import Button from './Button';

export default function Dialog({ title, body, lines, restore, restoreChecked, onToggleRestore, cancelLabel = 'Cancel', confirmLabel, confirmVariant = 'accent', onCancel, onConfirm }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,42,34,.45)', backdropFilter: 'blur(3px)', display: 'grid', placeItems: 'center', padding: 40, zIndex: 40 }}>
      <div style={{ width: 480, maxWidth: '100%', background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-float)', padding: 26, display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ font: 'var(--type-card-title)', color: 'var(--text-heading)' }}>{title}</div>
          <div style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-muted)', textWrap: 'pretty' }}>{body}</div>
        </div>
        {!!lines?.length && (
          <div style={{ display: 'grid', gap: 8, padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'var(--surface-subtle)', maxHeight: 220, overflow: 'auto' }}>
            {lines.map((line, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', fontSize: 'var(--fs-body-sm)', color: 'var(--text-body)' }}>
                <span>{line.label}</span>
                <span style={{ color: 'var(--text-faint)' }}>{line.value}</span>
              </div>
            ))}
          </div>
        )}
        {restore && (
          <div onClick={onToggleRestore} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', cursor: 'pointer' }}>
            <div
              style={{
                width: 20, height: 20, borderRadius: 6, display: 'grid', placeItems: 'center', cursor: 'pointer',
                flex: '0 0 auto', fontSize: 12, lineHeight: 1, transition: 'var(--transition-control)',
                background: restoreChecked ? 'var(--accent)' : 'var(--white)',
                border: '1px solid ' + (restoreChecked ? 'var(--accent)' : 'var(--border-strong)'),
                color: 'var(--accent-on)',
              }}
            >
              {restoreChecked ? '✓' : ''}
            </div>
            <span style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-body)' }}>Create a restore point first</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', paddingTop: 4 }}>
          <Button variant="ghost" size="md" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={confirmVariant} size="md" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
