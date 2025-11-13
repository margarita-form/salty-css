import { AstroIntegration } from 'astro';
import saltyPlugin from './astro-vite-plugin';
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
}

export const saltyIntegration = (options: SaltyIntegrationOptions = {}): AstroIntegration => {
  return {
    name: 'astro-salty-integration',
    hooks: {
      'astro:config:setup': ({ config, updateConfig }) => {
        const { srcDir = 'src', rootDir: dir = config.root.pathname } = options;
        const workingDir = join(dir, srcDir);

        updateConfig({
          vite: {
            plugins: [saltyPlugin(workingDir)],
          },
        });
      },
    },
  };
};

export default saltyIntegration;
