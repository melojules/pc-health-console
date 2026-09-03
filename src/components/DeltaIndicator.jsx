export default function DeltaIndicator({ value, direction = 'up', caption = 'than last month', style, ...rest }) {
  const positive = direction === 'up';
  const color = positive ? 'var(--positive)' : 'var(--negative)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--fs-caption)', color: 'var(--text-faint)', ...style }} {...rest}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color, fontWeight: 'var(--fw-medium)' }}>
        <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true" style={{ transform: positive ? 'none' : 'scaleY(-1)' }}>
          <path d="M1 8.5L8.5 1M8.5 1H4M8.5 1v4.5" stroke={color} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </svg>
        {value}
      </span>
      <span>{caption}</span>
    </div>
  );
}
