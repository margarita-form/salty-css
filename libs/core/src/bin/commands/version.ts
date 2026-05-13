import { Command } from 'commander';
import { join } from 'path';
import { logError, logger } from '../logger';
import { readPackageJson, readThisPackageJson } from '../package-json';

export const registerVersionOption = (program: Command): void => {
  program.option('-v, --version', 'Show the current version of Salty-CSS.').action(async function () {
    const cli = await readThisPackageJson();
    logger.info('CLI is running: ' + cli.version);

    const packageJSONPath = join(process.cwd(), 'package.json');
    const packageJson = await readPackageJson(packageJSONPath).catch((err) => logError(err));
    if (!packageJson) return;
    const allDependencies = { ...packageJson.dependencies, ...packageJson.devDependencies } as Record<string, string>;
    const saltyCssPackages = Object.keys(allDependencies).filter((dep) => dep === 'salty-css' || dep.startsWith('@salty-css/'));
    if (!saltyCssPackages.length) {
      return logError(
        'No Salty-CSS packages found in package.json. Make sure you are running update command in the same directory! Used package.json path: ' + packageJSONPath
      );
    }
    for (const dep of saltyCssPackages) {
      logger.info(`${dep}: ${allDependencies[dep]}`);
    }
  });
};
