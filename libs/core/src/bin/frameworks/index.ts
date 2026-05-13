import { ProjectContext } from '../context';
import { astroFramework } from './astro';
import { reactFramework } from './react';
import { FrameworkAdapter, FrameworkName } from './types';

/**
 * Adapters are evaluated in this order; the first whose `detect()` returns true wins.
 * React is the final fallback, so its `detect()` always returns true.
 */
export const frameworkRegistry: FrameworkAdapter[] = [astroFramework, reactFramework];

export const frameworksByName: Record<FrameworkName, FrameworkAdapter> = {
  astro: astroFramework,
  react: reactFramework,
};

export const detectFramework = async (ctx: ProjectContext): Promise<FrameworkAdapter> => {
  for (const adapter of frameworkRegistry) {
    if (await adapter.detect(ctx)) return adapter;
  }
  return reactFramework;
};

export const getFramework = (name: string | undefined): FrameworkAdapter | undefined => {
  if (!name) return undefined;
  return frameworksByName[name as FrameworkName];
};

export type { FrameworkAdapter, FrameworkName } from './types';
export { reactFramework } from './react';
export { astroFramework, findAstroConfig, astroConfigFiles } from './astro';
