export type StrictMode = boolean | 'warn' | undefined;

export const reportParserIssue = (strict: StrictMode, message: string): void => {
  if (strict === true) throw new Error(`[salty-css] ${message}`);
  if (strict === 'warn') console.warn(`[salty-css] ${message}`);
};
