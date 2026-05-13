import { existsSync } from 'fs';
import { join } from 'path';
import { FrameworkAdapter } from './types';
import { ProjectContext } from '../context';

export const astroConfigFiles = ['astro.config.mjs', 'astro.config.ts', 'astro.config.js', 'astro.config.cjs'] as const;

export const findAstroConfig = (projectDir: string): string | null => {
  for (const name of astroConfigFiles) {
    const path = join(projectDir, name);
    if (existsSync(path)) return path;
  }
  return null;
};

const hasAstroDependency = (ctx: ProjectContext): boolean => {
  const pkg = ctx.packageJson;
  if (!pkg) return false;
  const all = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
  return Object.prototype.hasOwnProperty.call(all, 'astro');
};

export const astroFramework: FrameworkAdapter = {
  name: 'astro',
  srcDirectory: 'src',
  detect: (ctx) => Boolean(findAstroConfig(ctx.projectDir)) || hasAstroDependency(ctx),
  runtimePackage: (version) => `@salty-css/astro@${version}`,
  templates: {
    styled: 'astro/styled-file.ts',
    component: {
      styled: 'astro/styled-file.ts',
      wrapper: 'astro/component.astro',
      wrapperExt: '.astro',
    },
  },
};
