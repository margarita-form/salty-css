import { readFile } from 'fs/promises';
import { isSaltyFile } from '../compiler';

export const checkShouldRestart = async (filename: string): Promise<boolean> => {
  if (!filename) return false;
  if (filename.includes('node_modules')) return false;
  if (filename.includes('saltygen')) return false;

  const isConfig = filename.includes('salty.config');
  if (isConfig) return true;
  const isSalty = isSaltyFile(filename);
  if (!isSalty) return false;
  const contents = await readFile(filename, 'utf-8');
  if (/.+define[A-Z]\w+/.test(contents)) return true;
  if (/.+keyframes\(.+/.test(contents)) return true;
  return false;
};
