export default function ProgressRing({
  value = 76,
  label,
  size = 54,
  thickness = 5,
  color = 'var(--coral-400)',
  track = 'rgba(255,255,255,.14)',
  labelColor = 'var(--text-on-dark)',
  style,
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: '0 0 auto', ...style }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset var(--dur-chart) var(--ease-out)' }}
        />
      </svg>
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          font: 'var(--type-label)',
          fontWeight: 'var(--fw-medium)',
          color: labelColor,
        }}
      >
        {label != null ? label : value}
      </span>
    </div>
  );
}
