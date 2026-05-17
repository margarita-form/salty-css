import { parseStyles } from '../parsers';
import { BaseStyles } from '../types';
import { CachedConfig, SaltyConfig } from '../types/config-types';
import { resolveDynamicConfigCache } from '../cache/resolve-dynamic-config-cache';
import { toHash } from '../util';

export interface InitializeDynamicStylesOptions {
  /**
   * Absolute path (or path relative to `process.cwd()`) to a `config-cache.json` file.
   * Wins over `configCachePaths` and the built-in search patterns when readable.
   */
  configCachePath?: string;
  /**
   * Extra paths searched before the built-in patterns. Each entry can be a directory
   * (the resolver will look for `config-cache.json`, `cache/config-cache.json`, and
   * `saltygen/cache/config-cache.json` inside) or a direct path to a `.json` file.
   */
  configCachePaths?: string[];
  /**
   * Pre-loaded config object. When provided, the filesystem is not touched — required
   * for edge runtimes (e.g. Cloudflare Workers) where `fs/promises` is unavailable.
   */
  config?: Partial<SaltyConfig & CachedConfig>;
}

export interface DynamicStylesHelpers {
  getDynamicStylesClassName: (styles: BaseStyles) => string;
  getDynamicStylesCss: (styles: BaseStyles, scope?: string) => Promise<string>;
}

/**
 * Create a hash of the dynamic styles that then can be used as scope.
 */
export const getDynamicStylesClassName = (styles: BaseStyles) => toHash(styles);

/**
 * Bind dynamic-styles helpers to a specific config / cache location.
 *
 * Useful when deploying to environments where the build-time `saltygen/` directory is
 * not available at runtime — e.g. an Astro site shipped to Cloudflare. Configure once
 * at app startup and reuse the returned helpers.
 *
 * @example
 *   const { getDynamicStylesCss } = initializeDynamicStyles({
 *     configCachePath: 'dist/saltygen/cache/config-cache.json',
 *   });
 */
export const initializeDynamicStyles = (options: InitializeDynamicStylesOptions = {}): DynamicStylesHelpers => {
  const resolveConfig = async () => {
    if (options.config) return options.config;
    return resolveDynamicConfigCache({
      primaryPath: options.configCachePath,
      extraPaths: options.configCachePaths,
    });
  };

  return {
    getDynamicStylesClassName,
    getDynamicStylesCss: async (styles, scope) => {
      const config = await resolveConfig();
      const parsed = await parseStyles(styles, scope, config);
      return parsed.join('\n');
    },
  };
};

const defaultHelpers = initializeDynamicStyles();

/**
 * Add any dynamic styles to your app with a custom scope.
 * Note: this works only with server components.
 *
 * For production deployments that strip the source tree (e.g. Cloudflare),
 * use {@link initializeDynamicStyles} to bind to a known cache location.
 */
export const getDynamicStylesCss = defaultHelpers.getDynamicStylesCss;
