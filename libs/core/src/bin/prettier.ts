import { existsSync } from 'fs';
import { join } from 'path';
import { execAsync } from './bin-util';
import { logger } from './logger';

const hasPrettierInstalled = (): boolean => {
  return existsSync(join(process.cwd(), 'node_modules', '.bin', 'prettier'));
};

export async function formatWithPrettier(filePath: string) {
  try {
    const hasPrettier = hasPrettierInstalled();
    if (!hasPrettier) return;
    await execAsync(`./node_modules/.bin/prettier --write "${filePath}"`);
    logger.info(`Formatted ${filePath} with Prettier`);
  } catch (error) {
    logger.error(`Error formatting ${filePath} with Prettier:`, error);
  }
}
