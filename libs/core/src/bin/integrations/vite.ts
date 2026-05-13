import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { npmInstall } from '../bin-util';
import { logger } from '../logger';
import { formatWithPrettier } from '../prettier';
import { BuildIntegrationAdapter, ConfigEdit } from './types';

export const vitePackage = (version: string) => `@salty-css/vite@${version}`;

/**
 * Returns the new content of a Vite config (with the salty plugin wired in),
 * or `{ content: null }` if the plugin is already present.
 */
export const editViteConfig = (existing: string): ConfigEdit => {
  if (existing.includes('saltyPlugin')) return { content: null };
  const pluginImport = "import { saltyPlugin } from '@salty-css/vite';\n";
  const pluginConfig = 'saltyPlugin(__dirname),';
  const withPlugin = existing.replace(/(plugins: \[)/, `$1\n  ${pluginConfig}`);
  return { content: pluginImport + withPlugin };
};

export const viteIntegration: BuildIntegrationAdapter = {
  name: 'vite',
  detect: (ctx) => {
    const path = join(ctx.projectDir, 'vite.config.ts');
    return existsSync(path) ? path : null;
  },
  apply: async (ctx, configPath) => {
    const existing = await readFile(configPath, 'utf-8').catch(() => undefined);
    if (existing === undefined) return { changed: false };
    const { content } = editViteConfig(existing);
    if (content === null) return { changed: false };

    logger.info('Edit file: ' + configPath);
    if (!ctx.skipInstall) await npmInstall(`-D ${vitePackage(ctx.cliVersion)}`);
    logger.info('Adding Salty-CSS plugin to Vite config...');
    await writeFile(configPath, content);
    await formatWithPrettier(configPath);
    return { changed: true };
  },
};
