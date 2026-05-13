import { ProjectContext } from '../context';
import { astroIntegration } from './astro';
import { eslintIntegration } from './eslint';
import { nextIntegration } from './next';
import { BuildIntegrationAdapter } from './types';
import { viteIntegration } from './vite';

export const buildIntegrationRegistry: BuildIntegrationAdapter[] = [eslintIntegration, viteIntegration, nextIntegration, astroIntegration];

export const detectAndApplyIntegrations = async (ctx: ProjectContext): Promise<{ name: string; configPath: string; changed: boolean }[]> => {
  const results: { name: string; configPath: string; changed: boolean }[] = [];
  for (const integration of buildIntegrationRegistry) {
    const configPath = await integration.detect(ctx);
    if (!configPath) continue;
    const result = await integration.apply(ctx, configPath);
    results.push({ name: integration.name, configPath, changed: result.changed });
  }
  return results;
};

export type { BuildIntegrationAdapter, ConfigEdit } from './types';
export { viteIntegration, editViteConfig, vitePackage } from './vite';
export { nextIntegration, editNextConfig, nextPackage, nextConfigFiles } from './next';
export { astroIntegration, editAstroConfig, astroPackage } from './astro';
export { eslintIntegration, editEslintConfig, eslintConfigCandidates } from './eslint';
