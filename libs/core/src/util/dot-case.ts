export function dotCase(str: PropertyKey): string {
  if (!str) return '';
  if (typeof str !== 'string') return dotCase(String(str));
  return str.replace(/[^\d\w]/g, '.');
}
