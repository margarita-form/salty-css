/* eslint-disable @typescript-eslint/no-explicit-any */
import { watch } from 'fs';
import { resolve } from 'path';
import { isSaltyFile } from '@salty-css/core/compiler/helpers';
import { SaltyCompiler, type SaltyCompilerMode } from '@salty-css/core/compiler/salty-compiler';
import { checkShouldRestart } from '@salty-css/core/server';
import { buildSaltyTurbopackRules } from './detect-bundler';

type AnyRecord = Record<any, any>;

export interface SaltyTurbopackWrapperOptions {
  mode?: SaltyCompilerMode;
  dir?: string;
}

const runtimeInitialized = new Map<string, boolean>();

const initSaltyTurbopackRuntime = (dir: string, mode?: SaltyCompilerMode) => {
  const key = `${dir}|${mode ?? ''}`;
  if (runtimeInitialized.get(key)) return;
  runtimeInitialized.set(key, true);

  const compiler = new SaltyCompiler(dir, { mode });
  compiler
    .generateCss()
    .then(() => {
      watch(dir, { recursive: true }, async (_event, filePath) => {
        if (!filePath) return;
        const absPath = resolve(dir, filePath.toString());
        const shouldRestart = await checkShouldRestart(absPath);
        if (shouldRestart) {
          await compiler.generateCss();
        } else if (isSaltyFile(absPath)) {
          await compiler.generateFile(absPath);
        }
      });
    })
    .catch((err) => {
      runtimeInitialized.set(key, false);
      console.error('[salty-css/next] failed to initialize Turbopack runtime:', err);
    });
};

export const __resetSaltyTurbopackRuntimeForTests = () => {
  runtimeInitialized.clear();
};

export const withSaltyTurbopack = <T extends AnyRecord>(nextConfig: T, options: SaltyTurbopackWrapperOptions = {}) => {
  const existingTurbopack: AnyRecord = nextConfig['turbopack'] ?? {};
  const dir: string = options.dir ?? existingTurbopack['root'] ?? process.cwd();
  const saltyRules = buildSaltyTurbopackRules(dir, options.mode);
  const rules = existingTurbopack['rules'] ?? {};
  const mergedRules = { ...rules, ...saltyRules };

  initSaltyTurbopackRuntime(dir, options.mode);

  return {
    ...nextConfig,
    turbopack: {
      ...existingTurbopack,
      rules: mergedRules,
    },
  };
};
