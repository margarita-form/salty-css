import { readFile, writeFile } from 'fs/promises';
import { npmInstall } from '../bin-util';
import { findAstroConfig } from '../frameworks/astro';
import { logger } from '../logger';
import { formatWithPrettier } from '../prettier';
import { BuildIntegrationAdapter, ConfigEdit } from './types';

export const astroPackage = (version: string) => `@salty-css/astro@${version}`;

const SALTY_ASTRO_IMPORT = "import saltyIntegration from '@salty-css/astro/integration';\n";

/**
 * Returns the new content of an Astro config (with saltyIntegration wired in),
 * or `{ content: null }` if the integration is already present or if no safe
 * insertion point was found.
 */
export const editAstroConfig = (existing: string): ConfigEdit & { warning?: string } => {
  if (existing.includes('@salty-css/astro')) return { content: null };

  let next = existing;
  let inserted = false;

  // Case 1: existing `integrations: [ ... ]` array — prepend our entry.
  if (/integrations\s*:\s*\[/.test(next)) {
    next = next.replace(/integrations\s*:\s*\[/, (m) => `${m}saltyIntegration(),`);
    inserted = true;
  } else if (/defineConfig\s*\(\s*\{/.test(next)) {
    // Case 2: no integrations key — inject one right after `defineConfig({`.
    next = next.replace(/defineConfig\s*\(\s*\{/, (m) => `${m}\n  integrations: [saltyIntegration()],`);
    inserted = true;
  }

  if (!inserted) {
    return {
      content: null,
      warning: 'Could not find a place to add saltyIntegration() in the Astro config. Please add it manually.',
    };
  }

  return { content: SALTY_ASTRO_IMPORT + next };
};

export const astroIntegration: BuildIntegrationAdapter = {
  name: 'astro',
  detect: (ctx) => findAstroConfig(ctx.projectDir),
  apply: async (ctx, configPath) => {
    const existing = await readFile(configPath, 'utf-8').catch(() => undefined);
    if (existing === undefined) return { changed: false };
    const result = editAstroConfig(existing);
    if (result.warning) logger.warn(result.warning);
    if (result.content === null) return { changed: false };

    if (!ctx.skipInstall) await npmInstall(`-D ${astroPackage(ctx.cliVersion)}`);
    logger.info('Adding Salty-CSS integration to Astro config: ' + configPath);
    await writeFile(configPath, result.content);
    await formatWithPrettier(configPath);
    return { changed: true };
  },
};
