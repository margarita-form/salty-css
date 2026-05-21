import type { SaltyCompiler } from '@salty-css/core/compiler/salty-compiler';

type Importer = undefined | ((path: string) => Promise<any>);

export type SaltyFileTransform = (compiler: SaltyCompiler, file: string) => Promise<string | undefined>;

export interface FrameworkEntry {
  name: string;
  importMarkers: RegExp[];
  loadTransform: (importer: Importer) => Promise<SaltyFileTransform>;
}

export const frameworkRegistry: FrameworkEntry[] = [
  {
    name: 'react',
    importMarkers: [/['"]@salty-css\/react(\/[^'"]*)?['"]/],
    loadTransform: async (importer) => {
      const path = '@salty-css/react/transform-salty-file';
      const mod = importer ? await importer(path) : await import(path);
      return mod.transformSaltyFile;
    },
  },
];

const transformCache = new Map<string, Promise<SaltyFileTransform>>();

export const getFrameworkTransform = (entry: FrameworkEntry, importer: Importer): Promise<SaltyFileTransform> => {
  const cached = transformCache.get(entry.name);
  if (cached) return cached;
  const promise = entry.loadTransform(importer);
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
