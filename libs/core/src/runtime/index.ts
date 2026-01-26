import type { CachedConfig, SaltyConfig } from '../config';
import type { BaseStyles } from '../types';
import { parseStyles } from '../parsers/parse-styles';

type Config = Partial<SaltyConfig & CachedConfig>;

export const defineRuntime = (config: Config) => {
  const getDynamicStylesCss = async (styles: BaseStyles, scope?: string) => {
    const parsed = await parseStyles(styles, scope, config);
    return parsed.join('\n');
  };

  return { getDynamicStylesCss };
};
