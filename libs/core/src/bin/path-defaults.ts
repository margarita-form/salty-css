import { FrameworkName } from './frameworks';

export interface PathDefaultsInput {
  framework: FrameworkName;
  /** Names of build integrations detected for the project, e.g. ['vite'] or ['next','eslint']. */
  integrations: string[];
  /** Whether a `src/` directory exists at the project root. */
  hasSrcDir: boolean;
}

export interface PathDefaults {
  include?: string[];
  exclude?: string[];
}

/** Build-output dirs to exclude, per build integration. Relative to the walk (app) root. */
const BUILD_OUTPUTS: Record<string, string[]> = {
  vite: ['dist/**'],
  next: ['.next/**', 'out/**'],
};

/**
 * Compute sensible default `include` / `exclude` globs for a freshly initialized project.
 * - Astro is already scoped to `src/` by its plugin (it roots the compiler there), so it
 *   gets no defaults.
 * - React / Vite / Next: exclude known build outputs, and narrow the walk to `src/**` only
 *   when a `src/` folder actually exists (projects with root-level salty files keep the full walk).
 */
export const computePathDefaults = ({ framework, integrations, hasSrcDir }: PathDefaultsInput): PathDefaults => {
  // Astro's plugin already roots the compiler at <project>/src — no defaults apply.
  if (framework === 'astro') return {};

  const exclude = [...new Set(integrations.flatMap((name) => BUILD_OUTPUTS[name] ?? []))];
  const result: PathDefaults = {};
  if (hasSrcDir) result.include = ['src/**'];
  if (exclude.length) result.exclude = exclude;
  return result;
};
