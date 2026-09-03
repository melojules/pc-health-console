export default function BrandLockup({ name = 'AeuxGlobal', mark, onDark = true, size = 17, style, ...rest }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', ...style }} {...rest}>
      {mark}
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 'var(--fw-medium)',
          fontSize: size,
          letterSpacing: 'var(--ls-tight)',
          color: onDark ? 'var(--text-on-dark)' : 'var(--text-heading)',
        }}
      >
        {name}
      </span>
    </div>
  );
}
