import { ProjectContext } from '../context';
import { astroIntegration } from './astro';
import { eslintIntegration } from './eslint';
import { nextIntegration } from './next';
import { BuildIntegrationAdapter, IntegrationPlan } from './types';
import { viteIntegration } from './vite';

export const buildIntegrationRegistry: BuildIntegrationAdapter[] = [eslintIntegration, viteIntegration, nextIntegration, astroIntegration];

export interface PlannedIntegration {
  name: string;
  configPath: string;
  plan: IntegrationPlan;
}

/** Detect every integration that has work to do and compute its plan. */
export const planIntegrations = async (ctx: ProjectContext): Promise<PlannedIntegration[]> => {
  const planned: PlannedIntegration[] = [];
  for (const integration of buildIntegrationRegistry) {
    const configPath = await integration.detect(ctx);
    if (!configPath) continue;
    const plan = await integration.plan(ctx, configPath);
    if (!plan) continue;
    planned.push({ name: integration.name, configPath, plan });
  }
  return planned;
};

/** Execute each previously-planned integration (writes config files). */
export const applyIntegrationPlans = async (
  planned: PlannedIntegration[]
): Promise<{ name: string; configPath: string; changed: boolean }[]> => {
  const results: { name: string; configPath: string; changed: boolean }[] = [];
  for (const { name, configPath, plan } of planned) {
    const result = await plan.execute();
    results.push({ name, configPath, changed: result.changed });
  }
  return results;
};

export type { BuildIntegrationAdapter, ConfigEdit, IntegrationPlan } from './types';
export { viteIntegration, editViteConfig, vitePackage } from './vite';
export { nextIntegration, editNextConfig, nextPackage, nextConfigFiles } from './next';
export { astroIntegration, editAstroConfig, astroPackage } from './astro';
export { eslintIntegration, editEslintConfig, eslintConfigCandidates } from './eslint';
