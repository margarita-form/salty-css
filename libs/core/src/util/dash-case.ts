export function dashCase(str: string): string | undefined {
  if (!str) {
    return undefined;
  }
  return str.replace(/\s/g, '-').replace(/[A-Z](?:(?=[^A-Z])|[A-Z]*(?=[A-Z][^A-Z]|$))/g, function (s, i) {
    return (i > 0 ? '-' : '') + s.toLowerCase();
  });
}
