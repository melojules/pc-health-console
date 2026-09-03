// Converts a "prop:value;prop:value" CSS string (as returned by main-process
// services, which build inline bar styles) into a React style object.
export function cssTextToStyle(cssText) {
  const style = {};
  for (const decl of (cssText || '').split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    const value = decl.slice(i + 1).trim();
    if (!prop || !value) continue;
    const camel = prop.startsWith('--') ? prop : prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    style[camel] = value;
  }
  return style;
}
