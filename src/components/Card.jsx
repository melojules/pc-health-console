export default function Card({ tone = 'light', padding = 'var(--pad-card)', radius, style, children, ...rest }) {
  const tones = {
    light: { background: 'var(--surface-card)', border: '1px solid var(--border-card)', color: 'var(--text-body)' },
    mint: { background: 'var(--surface-card-alt)', border: '1px solid transparent', color: 'var(--text-body)' },
    dark: { background: 'var(--surface-inverse)', border: '1px solid transparent', color: 'var(--text-on-dark)' },
    green: { background: 'linear-gradient(150deg,var(--green-700),var(--green-800))', border: '1px solid transparent', color: 'var(--text-on-dark)' },
  }[tone];
  return (
    <div
      style={{
        borderRadius: radius || 'var(--radius-widget)',
        padding,
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
        ...tones,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
