import { AstroIntegration } from 'astro';
import saltyPlugin from './integration/astro-vite-plugin';
import { join } from 'path';

interface SaltyIntegrationOptions {
  /**
   * The source directory where SaltyCSS Config is located.
   * Default is "src".
   */
  srcDir?: string;
  /**
   * Override full path to the project directory.
   * Default is the current directory of the Astro configuration.
   */
  rootDir?: string;
  /**
   * Register middleware that collects rendered component CSS into `Astro.locals.cssUrls`
   * and injects it where `<CssCollector />` is placed. Default is false.
   */
  cssCollector?: boolean;
}

const localsTypes = `declare namespace App {
  interface Locals {
    cssUrls?: Set<string>;
    saltyCssCollector?: boolean;
  }
}
`;

export const saltyIntegration = (options: SaltyIntegrationOptions = {}): AstroIntegration => {
  return {
    name: 'astro-salty-integration',
    hooks: {
      'astro:config:setup': ({ config, updateConfig, addMiddleware }) => {
        const { srcDir = 'src', rootDir: dir = config.root.pathname, cssCollector = false } = options;
        const workingDir = join(dir, srcDir);

        updateConfig({
          vite: {
            plugins: [saltyPlugin(workingDir)],
          },
        });

        if (cssCollector) addMiddleware({ entrypoint: '@salty-css/astro/middleware', order: 'pre' });
      },
      'astro:config:done': ({ injectTypes }) => {
        injectTypes({ filename: 'locals.d.ts', content: localsTypes });
      },
    },
  };
};

export default saltyIntegration;
