import type { CachedConfig, SaltyConfig } from '../config';
import type { BaseStyles } from '../types';
import { parseStyles } from '../parsers/parse-styles';
import { toHash } from '../util';

type Config = Partial<SaltyConfig & CachedConfig>;

export const defineRuntime = (config: Config) => {
  const className = (styles: BaseStyles) => toHash(styles);

  const css = async (styles: BaseStyles, scope?: string) => {
    const parsed = await parseStyles(styles, scope, config);
    return parsed.join('\n');
  };

  const resolve = async (styles: BaseStyles, scope?: string) => {
    const _className = className(styles);
    const _css = await css(styles, scope || `.${_className}`);
    return { className: _className, css: _css };
  };

  return {
    className,
    css,
    resolve,
    /** @deprecated Use `css` instead. Kept as an alias for backward compatibility with the standalone `getDynamicStylesCss` helper. */
    getDynamicStylesCss: css,
  };
};
