import { Command } from 'commander';
import { watch as watchChanges } from 'fs';
import { SaltyCompiler } from '../../compiler/salty-compiler';
import { isSaltyFile } from '../../compiler/helpers';
import { checkShouldRestart } from '../../server';
import { resolveProjectDir } from '../context';
import { logError, logger } from '../logger';
import { getDefaultProject } from '../saltyrc';

interface BuildOptions {
  dir: string;
  watch: boolean;
}

export const registerBuildCommand = (program: Command, defaultProject: string | undefined): void => {
  program
    .command('build [directory]')
    .alias('b')
    .description('Build the Salty-CSS project.')
    .option('-d, --dir <dir>', 'Project directory to build the project in.')
    .option('--watch', 'Watch for changes and rebuild the project.')
    .action(async function (this: Command, _dir = defaultProject) {
      logger.info('Building the Salty-CSS project...');
      const { dir = _dir, watch } = this.opts<BuildOptions>();
      const resolved = dir ?? (await getDefaultProject());
      if (!resolved) return logError('Project directory must be provided. Add it as the first argument after build command or use the --dir option.');
      const projectDir = resolveProjectDir(resolved);
      const compiler = new SaltyCompiler(projectDir);
      await compiler.generateCss();
      if (watch) {
        logger.info('Watching for changes in the project directory...');
        watchChanges(projectDir, { recursive: true }, async (_event, filePath) => {
          const shouldRestart = await checkShouldRestart(filePath);
          if (shouldRestart) {
            await compiler.generateCss(false);
          } else if (isSaltyFile(filePath)) {
            await compiler.generateFile(filePath);
          }
        });
      }
    });
};
