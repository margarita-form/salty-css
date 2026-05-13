import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { RCFile } from '../types/cli-types';
import { formatWithPrettier } from './prettier';
import { logger } from './logger';

export const SALTYRC_FILENAME = '.saltyrc.json';
export const SALTYRC_SCHEMA = './node_modules/@salty-css/core/.saltyrc.schema.json';
export const SALTYRC_INFO =
  'This file is used to define projects and their configurations for Salty CSS cli. Do not delete, modify or add this file to .gitignore.';

export interface ProjectEntry {
  dir: string;
  framework: string;
  [key: string]: unknown;
}

export const saltyrcPath = (rootDir: string = process.cwd()) => join(rootDir, SALTYRC_FILENAME);

export const readRc = async (rootDir: string = process.cwd()): Promise<RCFile> => {
  const content = await readFile(saltyrcPath(rootDir), 'utf-8')
    .then(JSON.parse)
    .catch(() => ({}));
  return content as RCFile;
};

export const readRawRc = async (rootDir: string = process.cwd()): Promise<string | undefined> => {
  return readFile(saltyrcPath(rootDir), 'utf-8').catch(() => undefined);
};

export const getDefaultProject = async (rootDir: string = process.cwd()): Promise<string | undefined> => {
  const rc = await readRc(rootDir);
  return rc.defaultProject;
};

/**
 * Pure transform: returns the new saltyrc content for an upsert. Does not touch the filesystem.
 * - If `existingRaw` is undefined, returns a fresh file with the project as the only entry.
 * - If the project entry already exists, returns the same content (no-op).
 * - Otherwise appends the new entry and returns updated content.
 */
export const upsertProjectInRc = (
  existingRaw: string | undefined,
  relativeProjectPath: string,
  framework: string
): { content: string; changed: boolean; created: boolean } => {
  if (existingRaw === undefined) {
    const fresh = {
      $schema: SALTYRC_SCHEMA,
      info: SALTYRC_INFO,
      defaultProject: relativeProjectPath,
      projects: [{ dir: relativeProjectPath, framework } satisfies ProjectEntry],
    };
    return { content: JSON.stringify(fresh, null, 2), changed: true, created: true };
  }

  const rc = JSON.parse(existingRaw) as RCFile;
  const projects = (rc.projects || []) as ProjectEntry[];
  const exists = projects.some((p) => p.dir === relativeProjectPath);
  if (exists) return { content: existingRaw, changed: false, created: false };
  projects.push({ dir: relativeProjectPath, framework });
  rc.projects = [...projects];
  const next = JSON.stringify(rc, null, 2);
  return { content: next, changed: next !== existingRaw, created: false };
};

/**
 * Writes the saltyrc file, creating or updating the project entry for the given dir.
 * Returns true when a write occurred.
 */
export const writeProjectToRc = async (rootDir: string, relativeProjectPath: string, framework: string): Promise<boolean> => {
  const path = saltyrcPath(rootDir);
  const existing = await readRawRc(rootDir);
  const { content, changed, created } = upsertProjectInRc(existing, relativeProjectPath, framework);
  if (!changed) return false;
  if (created) logger.info('Creating file: ' + path);
  else logger.info('Edit file: ' + path);
  await writeFile(path, content);
  await formatWithPrettier(path);
  return true;
};

export const getProjectFramework = (rc: RCFile, relativeProjectPath: string): string | undefined => {
  const projects = rc.projects || [];
  const entry = projects.find((p) => p.dir === relativeProjectPath);
  return entry?.framework;
};
