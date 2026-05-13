import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { npmInstall } from '../bin-util';
import { corePackages } from '../package-json';
import { logger } from '../logger';
import { formatWithPrettier } from '../prettier';
import { BuildIntegrationAdapter, ConfigEdit } from './types';

const ESLINT_CONFIG_CANDIDATES = [
  // Project-local candidates first, then root-level.
  ['projectJs', 'eslint.config.js'],
  ['rootJs', 'eslint.config.js'],
  ['projectMjs', 'eslint.config.mjs'],
  ['rootMjs', 'eslint.config.mjs'],
  ['projectJson', '.eslintrc.json'],
  ['rootJson', '.eslintrc.json'],
] as const;

export const eslintConfigCandidates = (projectDir: string, rootDir: string): string[] => {
  return ESLINT_CONFIG_CANDIDATES.map(([scope, name]) => {
    const base = scope.startsWith('root') ? rootDir : projectDir;
    return join(base, name);
  });
};

export const editEslintConfig = (existing: string, isJsFlat: boolean): ConfigEdit & { warning?: string } => {
  if (existing.includes('salty-css')) return { content: null };

  if (isJsFlat) {
    const importStatement = 'import saltyCss from "@salty-css/eslint-config-core/flat";';
    let newContent = `${importStatement}\n${existing}`;
    const isTsEslint = existing.includes('typescript-eslint');
    if (isTsEslint) {
      if (newContent.includes('.config(')) {
        newContent = newContent.replace('.config(', '.config(saltyCss,');
      } else {
        return {
          content: null,
          warning: 'Could not find the correct place to add the Salty-CSS config for ESLint. Please add it manually.',
        };
      }
    } else {
      if (newContent.includes('export default [')) {
        newContent = newContent.replace('export default [', 'export default [ saltyCss,');
      } else if (newContent.includes('eslintConfig = [')) {
        newContent = newContent.replace('eslintConfig = [', 'eslintConfig = [ saltyCss,');
      } else {
        return {
          content: null,
          warning: 'Could not find the correct place to add the Salty-CSS config for ESLint. Please add it manually.',
        };
      }
    }
    return { content: newContent };
  }

  const json = JSON.parse(existing);
  if (!json.extends) json.extends = [];
  if (!json.extends.includes('@salty-css/core')) json.extends.push('@salty-css/core');
  return { content: JSON.stringify(json, null, 2) };
};

export const eslintIntegration: BuildIntegrationAdapter = {
  name: 'eslint',
  detect: (ctx) => {
    const candidates = eslintConfigCandidates(ctx.projectDir, ctx.cwd);
    return candidates.find((p) => existsSync(p)) ?? null;
  },
  apply: async (ctx, configPath) => {
    const existing = await readFile(configPath, 'utf-8').catch(() => undefined);
    if (existing === undefined) {
      logger.error('Could not read ESLint config file.');
      return { changed: false };
    }

    if (!ctx.skipInstall) await npmInstall(corePackages.eslintConfigCore(ctx.cliVersion));

    const result = editEslintConfig(existing, configPath.endsWith('js'));
    if (result.warning) logger.warn(result.warning);
    if (result.content === null) return { changed: false };

    logger.info('Edit file: ' + configPath);
    await writeFile(configPath, result.content);
    await formatWithPrettier(configPath);
    return { changed: true };
  },
};
