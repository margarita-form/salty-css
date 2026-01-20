import { readFile } from 'fs/promises';
import { join } from 'path';

export const resolveDynamicConfigCache = async () => {
  const currentDir = process.cwd();
  const filename = 'config-cache.json';
  const patterns = ['', 'saltygen', 'src', 'src/saltygen', 'cache', 'src/cache', 'saltygen/cache', 'src/saltygen/cache'];

  let contents = '';
  for (const pattern of patterns) {
    const potentialPath = join(currentDir, pattern, filename);
    console.log(`Checking for config cache at: ${potentialPath}`);
    try {
      contents = await readFile(potentialPath, 'utf8');
      break;
    } catch {
      // File not found, continue searching
    }
  }

  if (!contents) {
    console.warn(`Could not find config cache file (${filename}) in any of the expected locations.`);
    return {};
  }

  return JSON.parse(contents);
};
