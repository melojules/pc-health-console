export default function UserAccount({ name, handle, avatar, style, ...rest }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', ...style }} {...rest}>
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: 'var(--radius-pill)',
          overflow: 'hidden',
          flex: '0 0 auto',
          background: 'var(--green-600)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--text-on-dark)',
          fontSize: 'var(--fs-label)',
        }}
      >
        {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (name || '?').slice(0, 1)}
      </span>
      <span style={{ display: 'grid', gap: 1, minWidth: 0 }}>
        <span style={{ color: 'var(--text-on-dark)', fontSize: 'var(--fs-body-sm)', fontWeight: 'var(--fw-medium)' }}>{name}</span>
        <span style={{ color: 'var(--text-on-dark-muted)', fontSize: 'var(--fs-caption)' }}>{handle}</span>
      </span>
    </div>
  );
}
