export default function NavItem({ icon, label, active = false, style, ...rest }) {
  return (
    <button
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        width: '100%',
        padding: '6px 12px 6px 6px',
        border: '1px solid ' + (active ? 'var(--border-on-dark)' : 'transparent'),
        background: active ? 'var(--overlay-sidebar-active)' : 'transparent',
        borderRadius: 'var(--radius-pill)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'var(--transition-control)',
        color: active ? 'var(--text-on-dark)' : 'var(--text-on-dark-muted)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--fs-body-sm)',
        fontWeight: active ? 'var(--fw-medium)' : 'var(--fw-regular)',
        ...style,
      }}
      {...rest}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 'var(--radius-pill)',
          display: 'grid',
          placeItems: 'center',
          background: active ? 'var(--white)' : 'rgba(255,255,255,.10)',
          color: active ? 'var(--green-700)' : 'var(--text-on-dark-muted)',
          flex: '0 0 auto',
        }}
      >
        {icon}
      </span>
      {label}
    </button>
  );
}
