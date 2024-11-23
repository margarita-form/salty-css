#!/usr/bin/env node
import { Command } from 'commander';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, relative, parse as parsePath, format as formatPath } from 'path';
import { render } from 'ejs';
import { generateCss } from '../compiler';
import { pascalCase } from '../util';
import { logger } from './logger';
import { formatWithPrettier } from './prettier';
import { npmInstall } from './bin-util';

async function main() {
  const program = new Command();

  program.name('salty-css').description('Salty-CSS CLI tool to help with annoying configuration tasks.');

  const files = {
    // Core files
    'salty.config.ts': import('./templates/salty.config.ts__template'),
    'saltygen/index.css': import('./templates/index.css__template'),
    // React
    'react/react-styled-file.ts': import('./templates/react-styled-file.ts__template'),
  } as const;

  type Template = keyof typeof files;

  const readTemplate = async <T extends object>(fileName: Template, options?: T) => {
    const { default: file } = await files[fileName];
    const content = render(file, options);
    return { fileName, content };
  };

  interface RCFile {
    defaultProject: string;
    projects: string[];
  }

  const readRCFile = async () => {
    const rcPath = join(process.cwd(), '.saltyrc');
    const rcContent = await readFile(rcPath, 'utf-8')
      .then(JSON.parse)
      .catch(() => ({}));

    return rcContent as RCFile;
  };

  const getDefaultProject = async () => {
    const rcContent = await readRCFile();
    return rcContent.defaultProject;
  };

  const defaultProject = await getDefaultProject();

  interface InitOptions {
    dir: string;
    cssFile?: string;
  }

  program
    .command('init')
    .description('Initialize a new Salty-CSS project.')
    .requiredOption('-d, --dir <dir>', 'Project directory to initialize the project in.')
    .option('--css-file <css-file>', 'Existing CSS file where to import the generated CSS. Path must be relative to the given project directory.')
    // Validate that all options are provided
    .action(async function (this: Command) {
      logger.info('Installing salty-css packages core, eslint-plugin and react');
      await npmInstall('@salty-css/core @salty-css/react');
      await npmInstall('-D @salty-css/eslint-plugin-core');

      logger.info('Initializing a new Salty-CSS project...');

      const { dir, cssFile } = this.opts<InitOptions>();
      const rootDir = process.cwd();
      const projectDir = join(rootDir, dir);
      const projectFiles = await Promise.all([readTemplate('salty.config.ts'), readTemplate('saltygen/index.css')]);

      // Create the project structure if it doesn't exist
      await mkdir(projectDir, { recursive: true });
      const writeFiles = projectFiles.map(async ({ fileName, content }) => {
        const filePath = join(projectDir, fileName);
        const existingContent = await readFile(filePath, 'utf-8').catch(() => undefined);
        if (existingContent !== undefined) {
          logger.debug('File already exists: ' + filePath);
          return;
        }
        const additionalFolders = fileName.split('/').slice(0, -1).join('/');
        // Create additional folders if they don't exist
        if (additionalFolders) await mkdir(join(projectDir, additionalFolders), { recursive: true });
        logger.info('Writing file: ' + filePath);
        await writeFile(filePath, content);
        await formatWithPrettier(filePath);
      });

      await Promise.all(writeFiles);

      // Create saltyrc file
      const relativeProjectPath = relative(rootDir, projectDir);
      const saltyrcPath = join(rootDir, '.saltyrc');
      const existingSaltyrc = await readFile(saltyrcPath, 'utf-8').catch(() => undefined);
      if (existingSaltyrc === undefined) {
        logger.info('Creating file: ' + saltyrcPath);
        const rcContent = {
          defaultProject: relativeProjectPath,
          projects: [relativeProjectPath],
        };
        const content = JSON.stringify(rcContent, null, 2);
        await writeFile(saltyrcPath, content);
      } else {
        logger.info('Edit file: ' + saltyrcPath);
        const rcContent = JSON.parse(existingSaltyrc);
        const projects = new Set(rcContent?.projects || []);
        projects.add(relativeProjectPath);
        rcContent.projects = [...projects];
        const content = JSON.stringify(rcContent, null, 2);
        await writeFile(saltyrcPath, content);
      }

      // Edit files in the project

      // Edit Gitignore
      const gitIgnorePath = join(rootDir, '.gitignore');
      const gitIgnoreContent = await readFile(gitIgnorePath, 'utf-8').catch(() => undefined);
      if (gitIgnoreContent !== undefined) {
        const alreadyIgnoresSaltygen = gitIgnoreContent.includes('saltygen');
        if (!alreadyIgnoresSaltygen) {
          logger.info('Edit file: ' + gitIgnorePath);
          await writeFile(gitIgnorePath, gitIgnoreContent + '\n\n# Salty-CSS\nsaltygen\n');
        }
      }

      // Edit the CSS file if provided
      if (cssFile) {
        const cssFilePath = join(projectDir, cssFile);
        const cssFileContent = await readFile(cssFilePath, 'utf-8').catch(() => undefined);
        if (cssFileContent !== undefined) {
          const alreadyImportsSaltygen = cssFileContent.includes('saltygen');
          if (!alreadyImportsSaltygen) {
            const cssFileFolder = join(cssFilePath, '..');
            const relativePath = relative(cssFileFolder, join(projectDir, 'saltygen/index.css'));
            const importStatement = `@import '${relativePath}';`;
            logger.info('Edit file: ' + cssFilePath);
            await writeFile(cssFilePath, importStatement + '\n' + cssFileContent);
            await formatWithPrettier(cssFilePath);
          }
        }
      }

      // Framework / build tool specific files

      // Detect vite and add the plugin
      const viteConfigPath = join(projectDir, 'vite.config.ts');
      const viteConfigContent = await readFile(viteConfigPath, 'utf-8').catch(() => undefined);

      if (viteConfigContent !== undefined) {
        const alreadyHasPlugin = viteConfigContent.includes('saltyPlugin');
        if (!alreadyHasPlugin) {
          logger.info('Edit file: ' + viteConfigPath);
          const pluginImport = "import { saltyPlugin } from '@salty-css/vite';\n";
          const pluginConfig = 'saltyPlugin(__dirname),';
          const newContent = viteConfigContent.replace(/(plugins: \[)/, `$1\n  ${pluginConfig}`);

          logger.info('Installing @salty-css/vite');
          await npmInstall('@salty-css/vite');

          logger.info('Adding Salty-CSS plugin to Vite config...');
          await writeFile(viteConfigPath, pluginImport + newContent);
          await formatWithPrettier(viteConfigPath);
        }
      }
    });

  interface BuildOptions {
    dir: string;
  }

  program
    .command('build')
    .alias('b')
    .description('Build the Salty-CSS project.')
    .option('-d, --dir <dir>', 'Project directory to build the project in.', defaultProject)
    .action(async function (this: Command) {
      logger.info('Building the Salty-CSS project...');
      const { dir } = this.opts<BuildOptions>();
      const projectDir = join(process.cwd(), dir);
      await generateCss(projectDir);
    });

  interface GenerateOptions {
    dir: string;
    tag: string;
    name?: string;
    className?: string;
  }

  program
    .command('generate <file>')
    .alias('g')
    .description('Generate a new component file.')
    .option('-d, --dir <dir>', 'Project directory to generate the file in.', defaultProject)
    .option('-t, --tag <tag>', 'HTML tag of the component.', 'div')
    .option('-n, --name <name>', 'Name of the component.')
    .option('-c, --className <className>', 'CSS class of the component.')
    .action(async function (this: Command, file: string) {
      const { dir, tag, name, className } = this.opts<GenerateOptions>();
      const projectDir = join(process.cwd(), dir);
      const filePath = join(projectDir, file);

      const parsedFilePath = parsePath(filePath);
      if (!parsedFilePath.ext) {
        parsedFilePath.ext = '.ts';
      }
      if (!parsedFilePath.name.endsWith('.css')) {
        parsedFilePath.name = parsedFilePath.name + '.css';
      }
      parsedFilePath.base = parsedFilePath.name + parsedFilePath.ext;
      const formattedFilePath = formatPath(parsedFilePath);

      const alreadyExists = await readFile(formattedFilePath, 'utf-8').catch(() => undefined);
      if (alreadyExists !== undefined) {
        logger.error('File already exists:', formattedFilePath);
        return;
      }
      logger.info('Generating a new file: ' + formattedFilePath);

      const _name = pascalCase(name || parsedFilePath.base.replace(/\.css\.\w+$/, ''));
      const { content } = await readTemplate('react/react-styled-file.ts', { tag, name: _name, className });
      await writeFile(formattedFilePath, content);

      await formatWithPrettier(formattedFilePath);
    });

  program.parseAsync(process.argv);
}

main().catch((e) => console.error(e));
