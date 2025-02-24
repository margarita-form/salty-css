import { readFile } from 'fs/promises';
import { isSaltyFile } from '../compiler';

export const checkShouldRestart = async (filename: string): Promise<boolean> => {
  const isConfig = filename.includes('salty.config');
  if (isConfig) return true;
  const isSalty = isSaltyFile(filename);
  if (!isSalty) return false;
  const contents = await readFile(filename, 'utf-8');
  if (/.+define[A-Z]\w+/.test(contents)) return true;
  return false;
};
