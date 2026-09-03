const base = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-2)',
  border: '1px solid transparent',
  borderRadius: 'var(--radius-control)',
  cursor: 'pointer',
  fontFamily: 'var(--font-sans)',
  fontWeight: 'var(--fw-medium)',
  letterSpacing: 0,
  transition: 'var(--transition-control)',
  whiteSpace: 'nowrap',
};
const sizes = {
  sm: { padding: '7px 14px', fontSize: 'var(--fs-caption)' },
  md: { padding: '10px 18px', fontSize: 'var(--fs-label)' },
  lg: { padding: '13px 24px', fontSize: 'var(--fs-body-sm)' },
};
const variants = {
  primary: { background: 'var(--surface-inverse)', color: 'var(--text-on-dark)' },
  accent: { background: 'var(--accent)', color: 'var(--accent-on)' },
  outline: { background: 'var(--surface-card)', color: 'var(--text-heading)', borderColor: 'var(--border-strong)' },
  ghost: { background: 'transparent', color: 'var(--text-muted)' },
  onDark: { background: 'rgba(255,255,255,.12)', color: 'var(--text-on-dark)', borderColor: 'var(--border-on-dark)' },
};

export default function Button({ variant = 'primary', size = 'md', iconLeft, iconRight, disabled, fullWidth, style, children, ...rest }) {
  return (
    <button
      disabled={disabled}
      style={{
        ...base,
        ...sizes[size],
        ...variants[variant],
        width: fullWidth ? '100%' : undefined,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
      {...rest}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}
