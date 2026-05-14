import { Command } from 'commander';
import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join, relative as relativePath } from 'path';
import { SaltyCompiler } from '../../compiler/salty-compiler';
import { npmInstall } from '../bin-util';
import { confirmInstall } from '../confirm-install';
import { buildContext } from '../context';
import { findGlobalCssFile } from '../detection/css-file';
import { detectFramework } from '../frameworks';
import { applyIntegrationPlans, planIntegrations } from '../integrations';
import { logError, logger } from '../logger';
import { addPrepareScript, corePackages, readPackageJson, updatePackageJson } from '../package-json';
import { formatWithPrettier } from '../prettier';
import { writeProjectToRc } from '../saltyrc';
import { readTemplate } from '../templates';

interface InitOptions {
  dir: string;
  cssFile?: string;
  skipInstall?: boolean;
  yes?: boolean;
}

const writeProjectFile = async (projectDir: string, fileName: string, content: string) => {
  const filePath = join(projectDir, fileName);
  if (existsSync(filePath)) {
    logger.debug('File already exists: ' + filePath);
    return;
  }
  const additionalFolders = fileName.split('/').slice(0, -1).join('/');
  if (additionalFolders) await mkdir(join(projectDir, additionalFolders), { recursive: true });
  logger.info('Creating file: ' + filePath);
  await writeFile(filePath, content);
  await formatWithPrettier(filePath);
};

const ensureGitignoreSaltygen = async (rootDir: string) => {
  const path = join(rootDir, '.gitignore');
  const existing = await readFile(path, 'utf-8').catch(() => undefined);
  if (existing === undefined) return;
  if (existing.includes('saltygen')) return;
  logger.info('Edit file: ' + path);
  await writeFile(path, existing + '\n\n# Salty-CSS\nsaltygen\n');
};

const importSaltygenIntoCss = async (projectDir: string, explicitCssFile: string | undefined) => {
  const target = explicitCssFile ?? (await findGlobalCssFile(projectDir));
  if (!target) {
    logger.warn('Could not find a CSS file to import the generated CSS. Please add it manually.');
    return;
  }
  const cssFilePath = join(projectDir, target);
  const cssFileContent = await readFile(cssFilePath, 'utf-8').catch(() => undefined);
  if (cssFileContent === undefined) return;
  if (cssFileContent.includes('saltygen')) return;
  const cssFileFolder = join(cssFilePath, '..');
  const relPath = relativePath(cssFileFolder, join(projectDir, 'saltygen/index.css'));
  logger.info('Adding global import statement to CSS file: ' + cssFilePath);
  await writeFile(cssFilePath, `@import '${relPath}';\n` + cssFileContent);
  await formatWithPrettier(cssFilePath);
};

const wirePrepareScript = async () => {
  const pkg = await readPackageJson().catch(() => {
    logError('Could not read package.json file.');
    return undefined;
  });
  if (!pkg) return;
  const { pkg: next } = addPrepareScript(pkg);
  await updatePackageJson(next);
};

export const registerInitCommand = (program: Command): void => {
  program
    .command('init [directory]')
    .description('Initialize a new Salty-CSS project.')
    .option('-d, --dir <dir>', 'Project directory to initialize the project in.')
    .option('--css-file <css-file>', 'Existing CSS file where to import the generated CSS. Path must be relative to the given project directory.')
    .option('--skip-install', 'Skip installing dependencies.')
    .option('-y, --yes', 'Skip the install confirmation prompt.')
    .action(async function (this: Command, _dir = '.') {
      try {
        const opts = this.opts<InitOptions>();
        const dir = opts.dir ?? _dir;
        if (!dir) return logError('Project directory must be provided. Add it as the first argument after init command or use the --dir option.');

        const ctx = await buildContext({ dir, skipInstall: opts.skipInstall, yes: opts.yes });

        logger.info('Initializing a new Salty-CSS project!');

        const framework = await detectFramework(ctx);
        logger.info(`Detected framework: ${framework.name}`);

        const plannedIntegrations = await planIntegrations(ctx);

        if (!ctx.skipInstall) {
          const packages = [
            corePackages.core(ctx.cliVersion),
            framework.runtimePackage(ctx.cliVersion),
            ...plannedIntegrations.flatMap((p) => p.plan.packages),
          ];
          await confirmInstall(packages, ctx.yes);
          await npmInstall(...packages);
        }

        const projectFiles = await Promise.all([readTemplate('salty.config.ts'), readTemplate('saltygen/index.css')]);
        await mkdir(ctx.projectDir, { recursive: true });
        await Promise.all(projectFiles.map(({ fileName, content }) => writeProjectFile(ctx.projectDir, fileName, content)));

        await writeProjectToRc(ctx.cwd, ctx.relativeProjectPath, framework);
        await ensureGitignoreSaltygen(ctx.cwd);
        await importSaltygenIntoCss(ctx.projectDir, opts.cssFile);

        await applyIntegrationPlans(plannedIntegrations);

        await wirePrepareScript();

        logger.info('Running the build to generate initial CSS...');
        const compiler = new SaltyCompiler(ctx.projectDir);
        await compiler.generateCss();

        logger.info('🎉 Salty CSS project initialized successfully!');
        logger.info('Next steps:');
        logger.info('1. Configure variables and templates in `salty.config.ts`');
        logger.info('2. Create a new component with `npx salty-css generate [component-name]`');
        logger.info('3. Run `npx salty-css build` to generate the CSS');
        logger.info('4. Read about the features in the documentation: https://salty-css.dev');
        logger.info('5. Star the project on GitHub: https://github.com/margarita-form/salty-css ⭐');
      } catch (err) {
        return logError(err instanceof Error ? err.message : String(err));
      }
    });
};
