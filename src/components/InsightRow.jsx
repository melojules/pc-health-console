import ProgressRing from './ProgressRing';

export default function InsightRow({ tone = 'dark', title, description, value, ringLabel, ringColor, action, style, ...rest }) {
  const dark = tone === 'dark';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-6)',
        padding: '14px 18px',
        borderRadius: 'var(--radius-pill)',
        background: dark ? 'var(--surface-inverse)' : 'var(--surface-card-alt)',
        color: dark ? 'var(--text-on-dark)' : 'var(--text-heading)',
        ...style,
      }}
      {...rest}
    >
      <ProgressRing
        value={value}
        label={ringLabel}
        color={ringColor || (dark ? 'var(--coral-400)' : 'var(--accent-strong)')}
        track={dark ? 'rgba(255,255,255,.14)' : 'var(--white)'}
        labelColor={dark ? 'var(--text-on-dark)' : 'var(--text-heading)'}
      />
      <div style={{ display: 'grid', gap: 2, flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--fs-h3)', fontWeight: 'var(--fw-semibold)', fontFamily: 'var(--font-display)' }}>{title}</div>
        <div style={{ fontSize: 'var(--fs-body-sm)', color: dark ? 'var(--text-on-dark-muted)' : 'var(--text-faint)' }}>{description}</div>
      </div>
      {action}
    </div>
  );
}
