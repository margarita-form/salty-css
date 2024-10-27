export function dashCase(str: string): string {
  if (!str) return '';
  return str
    .replace(/\s/g, '-')
    .replace(/[A-Z](?:(?=[^A-Z])|[A-Z]*(?=[A-Z][^A-Z]|$))/g, (s, i) => {
      return (i > 0 ? '-' : '') + s.toLowerCase();
    });
}
