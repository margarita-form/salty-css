import type { SaltyCompiler } from '@salty-css/core/compiler/salty-compiler';

export type SaltyFileTransform = (compiler: SaltyCompiler, file: string) => Promise<string | undefined>;

export interface FrameworkEntry {
  name: string;
  importMarkers: RegExp[];
  loadTransform: () => Promise<SaltyFileTransform>;
}

export const frameworkRegistry: FrameworkEntry[] = [
  {
    name: 'react',
    importMarkers: [/['"]@salty-css\/react(\/[^'"]*)?['"]/],
    loadTransform: async () => {
      // Resolve the published transform via a native import (Node resolves the
      // @salty-css/react package export). Do NOT route this through the
      // compiler's vite-node importer: that evaluates *files* by absolute path
      // and would `path.resolve` this bare specifier into a bogus path.
      const mod = await import(/* @vite-ignore */ '@salty-css/react/transform-salty-file');
      return mod.transformSaltyFile;
    },
  },
];

const transformCache = new Map<string, Promise<SaltyFileTransform>>();

export const getFrameworkTransform = (entry: FrameworkEntry): Promise<SaltyFileTransform> => {
  const cached = transformCache.get(entry.name);
  if (cached) return cached;
  const promise = entry.loadTransform();
  transformCache.set(entry.name, promise);
  return promise;
};

export const detectFramework = (source: string): FrameworkEntry | undefined => {
  for (const entry of frameworkRegistry) {
    for (const marker of entry.importMarkers) {
      if (marker.test(source)) return entry;
    }
  }
  return undefined;
};
