import { Command } from 'commander';
import { join } from 'path';
import { npmInstall } from '../bin-util';
import { confirmInstall } from '../confirm-install';
import { logError, logger } from '../logger';
import { readPackageJson, readThisPackageJson } from '../package-json';

interface UpdateOptions {
  version?: string;
  legacyPeerDeps: boolean;
  yes?: boolean;
}

const getSaltyCssPackages = async () => {
  const packageJSONPath = join(process.cwd(), 'package.json');
  const packageJson = await readPackageJson(packageJSONPath).catch((err) => logError(err));
  if (!packageJson) return logError('Could not read package.json file.');
  const allDependencies = { ...packageJson.dependencies, ...packageJson.devDependencies } as Record<string, string>;
  const saltyCssPackages = Object.entries(allDependencies).filter(([name]) => name === 'salty-css' || name.startsWith('@salty-css/'));
  if (!saltyCssPackages.length) {
    return logError(
      'No Salty-CSS packages found in package.json. Make sure you are running update command in the same directory! Used package.json path: ' + packageJSONPath
    );
  }
  return saltyCssPackages;
};

export const registerUpdateCommand = (program: Command): void => {
  program
    .command('update [version]')
    .alias('up')
    .description('Update Salty-CSS packages to the latest or specified version.')
    .option('-v, --version <version>', 'Version to update to.')
    .option('--legacy-peer-deps <legacyPeerDeps>', 'Use legacy peer dependencies (not recommended).', false)
    .option('-y, --yes', 'Skip the install confirmation prompt.')
    .action(async function (this: Command, _version = 'latest') {
      const { legacyPeerDeps, version = _version, yes = false } = this.opts<UpdateOptions>();
      const saltyCssPackages = await getSaltyCssPackages();
      if (!saltyCssPackages) return logError('Could not update Salty-CSS packages as any were found in package.json.');
      const cli = await readThisPackageJson();

      const packagesToUpdate = saltyCssPackages.map(([name]) => {
        if (version === '@') return `${name}@${cli.version}`;
        return `${name}@${version.replace(/^@/, '')}`;
      });

      try {
        await confirmInstall(packagesToUpdate, yes);
      } catch (err) {
        return logError(err instanceof Error ? err.message : String(err));
      }

      if (legacyPeerDeps) {
        logger.warn('Using legacy peer dependencies to update packages.');
        await npmInstall(...packagesToUpdate, '--legacy-peer-deps');
      } else {
        await npmInstall(...packagesToUpdate);
      }

      const updatedPackages = await getSaltyCssPackages();
      if (!updatedPackages) return logError('Something went wrong while reading the updated packages.');

      const mappedByVersions = updatedPackages.reduce((acc, [name, version]) => {
        if (!acc[version]) acc[version] = [];
        acc[version].push(name);
        return acc;
      }, {} as Record<string, string[]>);

      const versionsCount = Object.keys(mappedByVersions).length;

      if (versionsCount === 1) {
        const v = Object.keys(mappedByVersions)[0];
        logger.info(`Updated to all Salty CSS packages successfully to ${v.replace(/^\^/, '')}`);
      } else {
        for (const [v, names] of Object.entries(mappedByVersions)) {
          logger.info(`Updated to ${v.replace(/^\^/, '')}: ${names.join(', ')}`);
        }
      }
    });
};
