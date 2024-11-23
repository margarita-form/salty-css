export function camelCase(str: PropertyKey): string {
  if (!str) return '';
  if (typeof str !== 'string') return camelCase(String(str));
  return str.replace(/\s/g, '-').replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}
