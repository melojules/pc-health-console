export default function Checkbox({ checked, onChange, disabled, style }) {
  return (
    <div
      onClick={disabled ? undefined : onChange}
      style={{
        width: 20,
        height: 20,
        borderRadius: 6,
        display: 'grid',
        placeItems: 'center',
        cursor: disabled ? 'default' : 'pointer',
        flex: '0 0 auto',
        fontSize: 12,
        lineHeight: 1,
        transition: 'var(--transition-control)',
        background: checked ? 'var(--accent)' : 'var(--white)',
        border: '1px solid ' + (checked ? 'var(--accent)' : 'var(--border-strong)'),
        color: 'var(--accent-on)',
        opacity: disabled ? 0.35 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        ...style,
      }}
    >
      {checked ? '✓' : ''}
    </div>
  );
}
