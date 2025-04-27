import { parseStyles } from '@salty-css/core/parsers';
import { BaseStyles } from '@salty-css/core/types';

/**
 * Add any dynamic styles to your app with a custom scope.
 * Note: this works only with server components.
 */
export const DynamicStyles = async ({ scope, styles }: { scope: string; styles: BaseStyles }) => {
  const parsed = await parseStyles(styles, scope);
  const asString = parsed.join('\n');
  return <style>{asString}</style>;
};
