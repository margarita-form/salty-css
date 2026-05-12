import { parseStyles } from '../parsers';
import { BaseStyles } from '../types';
import { resolveDynamicConfigCache } from '../cache/resolve-dynamic-config-cache';
import { toHash } from '../util';

/**
 * Create a hash of the dynamic styles that then can be used as scope.
 */
export const getDynamicStylesClassName = (styles: BaseStyles) => {
  return toHash(styles);
};

/**
 * Add any dynamic styles to your app with a custom scope.
 * Note: this works only with server components.
 */
export const getDynamicStylesCss = async (styles: BaseStyles, scope?: string) => {
  const config = await resolveDynamicConfigCache();
  const parsed = await parseStyles(styles, scope, config);
  return parsed.join('\n');
};
