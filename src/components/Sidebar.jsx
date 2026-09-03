import BrandLockup from './BrandLockup';
import NavItem from './NavItem';
import UserAccount from './UserAccount';

const overline = {
  font: 'var(--type-overline)',
  letterSpacing: 'var(--ls-overline)',
  textTransform: 'uppercase',
  color: 'var(--text-on-dark-muted)',
};

export default function Sidebar({ items = [], activeId, onSelect, user, brandName = 'AeuxGlobal', style }) {
  return (
    <nav
      style={{
        width: 'var(--sidebar-w)',
        flex: '0 0 auto',
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--pad-sidebar) 14px',
        gap: 'var(--space-6)',
        color: 'var(--text-on-dark)',
        ...style,
      }}
    >
      <BrandLockup name={brandName} style={{ padding: '2px 6px' }} />
      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <div style={{ ...overline, padding: '0 6px' }}>Navigation</div>
        <div style={{ display: 'grid', gap: 'var(--space-2)', paddingTop: 2, borderTop: '1px solid var(--border-on-dark)' }}>
          {items.map((it) => (
            <NavItem key={it.id} icon={it.icon} label={it.label} active={it.id === activeId} onClick={() => onSelect && onSelect(it.id)} />
          ))}
        </div>
      </div>
      {user && (
        <div style={{ marginTop: 'auto', display: 'grid', gap: 'var(--space-4)', padding: '0 6px' }}>
          <div style={overline}>User Account</div>
          <UserAccount {...user} />
        </div>
      )}
    </nav>
  );
}
