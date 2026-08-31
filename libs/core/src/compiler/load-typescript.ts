/**
 * Resolves a TypeScript module that actually exposes the compiler API
 * (createSourceFile, ScriptTarget, node predicates, etc).
 *
 * Why this exists: TypeScript 7 is the Go-native compiler. Its npm package's
 * JS entry point only exports `version` and `versionMajorMinor` — the whole
 * programmatic compiler API is gone until TS 7.1 ships a stable API. So
 * `import ts from 'typescript'` in a TS 7 project gives you an object where
 * `ts.ScriptTarget` is undefined and `ts.createSourceFile` doesn't exist.
 *
 * Strategy: feature-detect instead of version-detect. Try candidates in
 * order and use the first module that actually has the API we need:
 *
 *   1. `typescript` — works for every project on TS <= 6.x (and will work
 *      again on TS >= 7.1 if the stable API lands under the same names).
 *   2. `@typescript/typescript6` — Microsoft's official side-by-side compat
 *      package for TS 7 projects. Re-exports the full 6.x API.
 *
 * If neither works, throw an error that tells the user exactly what to install.
 */

// The minimal surface get-function-range.ts needs. Typed loosely on purpose:
// we can't import types from 'typescript' itself, because in a TS 7 project
// those types describe an API that isn't there at runtime.
export interface TsCompilerApi {
  version: string;
  ScriptTarget: { Latest: number };
  createSourceFile: (fileName: string, sourceText: string, languageVersion: number, setParentNodes?: boolean) => TsSourceFile;
  isVariableDeclaration: (node: TsNode) => boolean;
}

export interface TsNode {
  getStart(): number;
  getEnd(): number;
  forEachChild(cb: (node: TsNode) => void): void;
  name?: { getText(): string };
}

export type TsSourceFile = TsNode;

const CANDIDATES = ['typescript', '@typescript/typescript6'];

const hasCompilerApi = (mod: unknown): mod is TsCompilerApi => {
  const ts = mod as Partial<TsCompilerApi> | undefined;
  return typeof ts?.createSourceFile === 'function' && typeof ts?.ScriptTarget?.Latest === 'number';
};

let cached: Promise<TsCompilerApi> | undefined;

export const loadTypeScript = (): Promise<TsCompilerApi> => {
  if (!cached) cached = resolveTypeScript();
  return cached;
};

const resolveTypeScript = async (): Promise<TsCompilerApi> => {
  let installedVersion: string | undefined;

  for (const specifier of CANDIDATES) {
    try {
      // Indirect specifier so bundlers don't try to statically resolve the
      // optional compat package at build time.
      const mod = await import(/* @vite-ignore */ /* webpackIgnore: true */ specifier);
      const ts = mod?.default ?? mod;
      if (hasCompilerApi(ts)) return ts;
      // Module exists but has no compiler API — this is TS 7's entry point.
      if (typeof ts?.version === 'string') installedVersion = ts.version;
    } catch {
      // Not installed — try the next candidate.
    }
  }

  const detected = installedVersion ? ` (found typescript ${installedVersion}, which does not include the compiler API)` : '';
  throw new Error(
    `Salty CSS could not find a TypeScript compiler API${detected}. ` +
      `TypeScript 7 does not ship the programmatic API that Salty CSS uses to parse style files. ` +
      `Install the official side-by-side compatibility package to fix this: npm install -D @typescript/typescript6`
  );
};
