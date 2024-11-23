export function pascalCase(str: PropertyKey): string {
  if (!str) return '';
  if (typeof str !== 'string') return pascalCase(String(str));
  return str
    .replace(/\s/g, '-')
    .replace(/[-_]([a-z0-9])/g, (g) => g[1].toUpperCase())
    .replace(/^[a-z]/, (g) => g.toUpperCase());
}
