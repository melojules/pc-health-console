export function pill(bg, fg) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '5px 11px',
    borderRadius: 999,
    fontSize: 'var(--fs-caption)',
    fontWeight: 'var(--fw-medium)',
    background: bg,
    color: fg,
    whiteSpace: 'nowrap',
  };
}

export const STATUS_PILL = {
  Outdated: pill('var(--coral-100)', 'var(--coral-600)'),
  Missing: pill('var(--surface-inverse)', 'var(--white)'),
  Unsigned: pill('#FDF3E0', '#8A6318'),
  'Up to date': pill('var(--green-50)', 'var(--green-600)'),
};
