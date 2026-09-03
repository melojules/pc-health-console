export default function Badge({ tone = 'light', size = 'md', style, children, ...rest }) {
  const tones = {
    light: { background: 'var(--surface-card)', color: 'var(--text-heading)', boxShadow: 'var(--shadow-pill)' },
    dark: { background: 'var(--surface-inverse)', color: 'var(--text-on-dark)', boxShadow: 'var(--shadow-pill)' },
    mint: { background: 'var(--accent-soft)', color: 'var(--green-600)' },
    accent: { background: 'var(--accent)', color: 'var(--accent-on)' },
    outline: { background: 'transparent', color: 'var(--text-muted)', boxShadow: 'inset 0 0 0 1px var(--border-strong)' },
  }[tone];
  const pad = size === 'sm' ? '4px 9px' : '6px 12px';
  const fs = size === 'sm' ? 'var(--fs-overline)' : 'var(--fs-caption)';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        padding: pad,
        fontSize: fs,
        fontWeight: 'var(--fw-medium)',
        fontFamily: 'var(--font-sans)',
        borderRadius: 'var(--radius-pill)',
        whiteSpace: 'nowrap',
        ...tones,
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
