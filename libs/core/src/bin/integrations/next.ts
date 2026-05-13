import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { npmInstall } from '../bin-util';
import { logger } from '../logger';
import { formatWithPrettier } from '../prettier';
import { BuildIntegrationAdapter, ConfigEdit } from './types';

export const nextConfigFiles = ['next.config.js', 'next.config.cjs', 'next.config.ts', 'next.config.mjs'] as const;

export const nextPackage = (version: string) => `@salty-css/next@${version}`;

/**
 * Returns the new content of a Next.js config (with withSaltyCss wired in),
 * or `{ content: null }` if the plugin is already present.
 */
export const editNextConfig = (existing: string): ConfigEdit => {
  if (existing.includes('withSaltyCss')) return { content: null };

  let next = existing;
  let saltyCssAppended = false;

  // Detect plugins array that is used at least with NX
  const hasPluginsArray = /\splugins([^=]*)=[^[]\[/.test(next);
  if (hasPluginsArray) {
    next = next.replace(/\splugins([^=]*)=[^[]\[/, (_, config) => ` plugins${config}= [withSaltyCss,`);
    saltyCssAppended = true;
  }

  const useRequire = next.includes('module.exports');
  const pluginImport = useRequire ? "const { withSaltyCss } = require('@salty-css/next');\n" : "import { withSaltyCss } from '@salty-css/next';\n";

  if (useRequire && !saltyCssAppended) {
    next = next.replace(/module.exports = ([^;]+)/, (_, config) => `module.exports = withSaltyCss(${config})`);
    saltyCssAppended = true;
  } else if (!saltyCssAppended) {
    next = next.replace(/export default ([^;]+)/, (_, config) => `export default withSaltyCss(${config})`);
  }

  return { content: pluginImport + next };
};

export const nextIntegration: BuildIntegrationAdapter = {
  name: 'next',
  detect: (ctx) => {
    const found = nextConfigFiles.map((file) => join(ctx.projectDir, file)).find((p) => existsSync(p));
    return found ?? null;
  },
  apply: async (ctx, configPath) => {
    const existing = await readFile(configPath, 'utf-8').catch(() => undefined);
    if (existing === undefined) return { changed: false };
    const { content } = editNextConfig(existing);
    if (content === null) return { changed: false };

    if (!ctx.skipInstall) await npmInstall(`-D ${nextPackage(ctx.cliVersion)}`);
    logger.info('Adding Salty-CSS plugin to Next.js config...');
    await writeFile(configPath, content);
    await formatWithPrettier(configPath);
    return { changed: true };
  },
};
