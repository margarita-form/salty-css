export function dashCase(str: PropertyKey): string {
  if (!str) return '';
  if (typeof str !== 'string') return dashCase(String(str));
  return str.replace(/\s/g, '-').replace(/[A-Z](?:(?=[^A-Z])|[A-Z]*(?=[A-Z][^A-Z]|$))/g, (s, i) => {
    return (i > 0 ? '-' : '') + s.toLowerCase();
  });
}
