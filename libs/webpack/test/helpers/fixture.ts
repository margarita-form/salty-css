import { existsSync, readdirSync } from 'fs';
import { rm } from 'fs/promises';
import { join, resolve } from 'path';

const FIXTURES_ROOT = resolve(__dirname, '..', 'fixtures');

export const fixturePath = (name: string) => join(FIXTURES_ROOT, name);

export const resetSaltygen = async (fixtureDir: string) => {
  const saltygen = join(fixtureDir, 'saltygen');
  if (existsSync(saltygen)) await rm(saltygen, { recursive: true, force: true });
};

export const cssFiles = (fixtureDir: string): string[] => {
  const cssDir = join(fixtureDir, 'saltygen', 'css');
  if (!existsSync(cssDir)) return [];
  return readdirSync(cssDir);
};

export const findCssFile = (fixtureDir: string, prefix: string): string | undefined => cssFiles(fixtureDir).find((file) => file.startsWith(prefix));
