// Lucide glyphs via CSS mask (documented substitution — no bundled icon
// asset was supplied with the original design), ported unchanged from the
// AeuxGlobal design-system bundle's components/icons/Icon.jsx.
const CDN = 'https://unpkg.com/lucide-static@0.441.0/icons/';

export default function Icon({ name, size = 16, strokeColor = 'currentColor', style, ...rest }) {
  const url = `url("${CDN}${name}.svg")`;
  return (
    <span
      role="img"
      aria-label={name}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        flex: '0 0 auto',
        background: strokeColor,
        WebkitMaskImage: url,
        maskImage: url,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        ...style,
      }}
      {...rest}
    />
  );
}
