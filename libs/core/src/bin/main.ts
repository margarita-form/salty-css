import { Command } from 'commander';
import { existsSync } from 'fs';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, relative, parse as parsePath, format as formatPath } from 'path';
import { render } from 'ejs';
import { generateCss } from '../compiler';
import { pascalCase } from '../util';
import { logError, logger } from './logger';
import { formatWithPrettier } from './prettier';
import { npmInstall } from './bin-util';
import { PathLike } from 'fs';

export async function main() {
  const program = new Command();

  program.name('salty-css').description('Salty-CSS CLI tool to help with annoying configuration tasks.');

  const files = {
    // Core files
    'salty.config.ts': import('./templates/salty.config.ts__template'),
    'saltygen/index.css': import('./templates/index.css__template'),
    // React
    'react/react-styled-file.ts': import('./templates/react-styled-file.ts__template'),
    'react/react-vanilla-file.ts': import('./templates/react-vanilla-file.ts__template'),
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

  const defaultPackageJsonPath = join(process.cwd(), 'package.json');

  const readPackageJson = async (filePath: PathLike = defaultPackageJsonPath) => {
    const packageJsonContent = await readFile(filePath, 'utf-8')
      .then(JSON.parse)
      .catch(() => undefined);
    if (!packageJsonContent) throw 'Could not read package.json file!';
    return packageJsonContent;
  };

  const updatePackageJson = async (content: string | object, filePath: PathLike = defaultPackageJsonPath) => {
    if (typeof content === 'object') content = JSON.stringify(content, null, 2);
    await writeFile(filePath, content);
  };

  const readThisPackageJson = async () => {
    const packageJsonPath = new URL('../package.json', import.meta.url);
    return readPackageJson(packageJsonPath);
  };

  const getDefaultProject = async () => {
    const rcContent = await readRCFile();
    return rcContent.defaultProject;
  };

  const defaultProject = await getDefaultProject();

  interface InitOptions {
    dir: string;
    cssFile?: string;
    skipInstall?: boolean;
  }

  const currentPackageJson = await readThisPackageJson();

  const packages = {
    core: `@salty-css/core@${currentPackageJson.version}`,
    react: `@salty-css/react@${currentPackageJson.version}`,
    eslintConfigCore: `@salty-css/eslint-config-core@${currentPackageJson.version}`,
    vite: `@salty-css/vite@${currentPackageJson.version}`,
    next: `@salty-css/next@${currentPackageJson.version}`,
  };

  const resolveProjectDir = (dir: string) => {
    const dirName = dir === '.' ? '' : dir;
    const rootDir = process.cwd();
    const projectDir = join(rootDir, dirName);
    return projectDir;
  };

  program
    .command('init [directory]')
    .description('Initialize a new Salty-CSS project.')
    .option('-d, --dir <dir>', 'Project directory to initialize the project in.')
    .option('--css-file <css-file>', 'Existing CSS file where to import the generated CSS. Path must be relative to the given project directory.')
    .option('--skip-install', 'Skip installing dependencies.')
    // Validate that all options are provided
    .action(async function (this: Command, _dir = '.') {
      const packageJson = await readPackageJson().catch(() => undefined);
      if (!packageJson) return logError('Salty CSS project must be initialized in a directory with a package.json file.');

      logger.info('Initializing a new Salty-CSS project!');
      const { dir = _dir, cssFile, skipInstall } = this.opts<InitOptions>();
      if (!dir) return logError('Project directory must be provided. Add it as the first argument after init command or use the --dir option.');

      if (!skipInstall) await npmInstall(packages.core, packages.react);

      const rootDir = process.cwd();

      const projectDir = resolveProjectDir(dir);
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
        logger.info('Creating file: ' + filePath);
        await writeFile(filePath, content);
        await formatWithPrettier(filePath);
      });

      await Promise.all(writeFiles);

      // Create saltyrc file
      const relativeProjectPath = relative(rootDir, projectDir) || '.';
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
      const cssFileFoldersToLookFor = ['src', 'public', 'assets', 'styles', 'css', 'app'];
      const secondLevelFolders = ['styles', 'css', 'app', 'pages'];
      const cssFilesToLookFor = ['index', 'styles', 'main', 'global', 'globals'];
      const cssFileExtensions = ['.css', '.scss', '.sass'];

      const getTargetCssFile = async () => {
        if (cssFile) return cssFile;
        for (const folder of cssFileFoldersToLookFor) {
          for (const file of cssFilesToLookFor) {
            for (const ext of cssFileExtensions) {
              const filePath = join(projectDir, folder, file + ext);
              const fileContent = await readFile(filePath, 'utf-8').catch(() => undefined);
              if (fileContent !== undefined) return relative(projectDir, filePath);
              for (const secondLevelFolder of secondLevelFolders) {
                const filePath = join(projectDir, folder, secondLevelFolder, file + ext);
                const fileContent = await readFile(filePath, 'utf-8').catch(() => undefined);
                if (fileContent !== undefined) return relative(projectDir, filePath);
              }
            }
          }
        }
        return undefined;
      };

      const targetCSSFile = await getTargetCssFile();
      if (targetCSSFile) {
        const cssFilePath = join(projectDir, targetCSSFile);
        const cssFileContent = await readFile(cssFilePath, 'utf-8').catch(() => undefined);
        if (cssFileContent !== undefined) {
          const alreadyImportsSaltygen = cssFileContent.includes('saltygen');
          if (!alreadyImportsSaltygen) {
            const cssFileFolder = join(cssFilePath, '..');
            const relativePath = relative(cssFileFolder, join(projectDir, 'saltygen/index.css'));
            const importStatement = `@import '${relativePath}';`;
            logger.info('Adding global import statement to CSS file: ' + cssFilePath);
            await writeFile(cssFilePath, importStatement + '\n' + cssFileContent);
            await formatWithPrettier(cssFilePath);
          }
        }
      } else {
        logger.warn('Could not find a CSS file to import the generated CSS. Please add it manually.');
      }

      // Framework / build tool specific files

      // Detect eslint and add the config
      const rootEslintConfigPath = join(rootDir, '.eslintrc.json');
      const rootEslintConfigExists = existsSync(rootEslintConfigPath);
      const projectEslintConfigPath = join(projectDir, '.eslintrc.json');
      const projectEslintConfigExists = existsSync(projectEslintConfigPath);

      if (rootEslintConfigExists || projectEslintConfigExists) {
        if (!skipInstall) await npmInstall(packages.eslintConfigCore);

        const eslintConfigToUse = projectEslintConfigExists ? projectEslintConfigPath : rootEslintConfigPath;
        const eslintConfigContent = await readFile(eslintConfigToUse, 'utf-8').catch(() => undefined);
        if (!eslintConfigContent) return logError('Could not read ESLint config file.');

        const alreadyHasSaltyConfig = eslintConfigContent.includes('salty-css');
        if (!alreadyHasSaltyConfig) {
          const eslintConfigJson = JSON.parse(eslintConfigContent);
          logger.info('Edit file: ' + eslintConfigToUse);

          if (!eslintConfigJson.extends) eslintConfigJson.extends = [];
          eslintConfigJson.extends.push('@salty-css/core');

          const modifiedEslintConfigContent = JSON.stringify(eslintConfigJson, null, 2);
          await writeFile(eslintConfigToUse, modifiedEslintConfigContent);
          await formatWithPrettier(eslintConfigToUse);
        }
      }

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

          if (!skipInstall) await npmInstall(`-D ${packages.vite}`);

          logger.info('Adding Salty-CSS plugin to Vite config...');
          await writeFile(viteConfigPath, pluginImport + newContent);
          await formatWithPrettier(viteConfigPath);
        }
      }

      // Detect next.js and add the plugin
      const nextConfigFiles = ['next.config.js', 'next.config.cjs', 'next.config.ts', 'next.config.mjs'];
      const nextConfigPath = nextConfigFiles.map((file) => join(projectDir, file)).find((path) => existsSync(path));
      if (nextConfigPath) {
        let nextConfigContent = await readFile(nextConfigPath, 'utf-8').catch(() => undefined);
        if (nextConfigContent !== undefined) {
          const alreadyHasPlugin = nextConfigContent.includes('withSaltyCss');
          if (!alreadyHasPlugin) {
            let saltyCssAppended = false;

            // Detect plugins array that is used at least with NX
            const hasPluginsArray = /\splugins([^=]*)=[^[]\[/.test(nextConfigContent);
            if (hasPluginsArray && !saltyCssAppended) {
              nextConfigContent = nextConfigContent.replace(/\splugins([^=]*)=[^[]\[/, (_, config) => {
                return ` plugins${config}= [withSaltyCss,`;
              });
              saltyCssAppended = true;
            }

            // Default way of adding plugin
            const useRequire = nextConfigContent.includes('module.exports');
            const pluginImport = useRequire ? "const { withSaltyCss } = require('@salty-css/next');\n" : "import { withSaltyCss } from '@salty-css/next';\n";

            if (useRequire && !saltyCssAppended) {
              nextConfigContent = nextConfigContent.replace(/module.exports = ([^;]+)/, (_, config) => {
                return `module.exports = withSaltyCss(${config})`;
              });
              saltyCssAppended = true;
            } else if (!saltyCssAppended) {
              nextConfigContent = nextConfigContent.replace(/export default ([^;]+)/, (_, config) => {
                return `export default withSaltyCss(${config})`;
              });
            }

            if (!skipInstall) await npmInstall(`-D ${packages.next}`);

            logger.info('Adding Salty-CSS plugin to Next.js config...');
            await writeFile(nextConfigPath, pluginImport + nextConfigContent);
            await formatWithPrettier(nextConfigPath);
          }
        }
      }

      // Add prepare script to package.json
      const packageJsonContent = await readPackageJson()
        .catch(() => logError('Could not read package.json file.'))
        .then((content) => {
          if (!content.scripts) content.scripts = {};
          if (content.scripts.prepare) {
            const alreadyHasSaltyCss = content.scripts.prepare.includes('salty-css');
            if (!alreadyHasSaltyCss) {
              logger.info('Edit file: ' + defaultPackageJsonPath);
              content.scripts.prepare = content.scripts.prepare + ' && npx salty-css build';
            }
          } else {
            logger.info('Edit file: ' + defaultPackageJsonPath);
            content.scripts.prepare = 'npx salty-css build';
          }
          return content;
        });

      await updatePackageJson(packageJsonContent);

      // All done & next steps
      logger.info('🎉 Salty CSS project initialized successfully!');
      logger.info('Next steps:');
      logger.info('1. Configure variables and templates in `salty.config.ts`');
      logger.info('2. Create a new component with `npx salty-css generate [component-name]`');
      logger.info('3. Run `npx salty-css build` to generate the CSS');
      logger.info('4. Read about the features in the documentation: https://salty-css.dev');
      logger.info('5. Star the project on GitHub: https://github.com/margarita-form/salty-css ⭐');
    });

  interface BuildOptions {
    dir: string;
  }

  program
    .command('build [directory]')
    .alias('b')
    .description('Build the Salty-CSS project.')
    .option('-d, --dir <dir>', 'Project directory to build the project in.')
    .action(async function (this: Command, _dir = defaultProject) {
      logger.info('Building the Salty-CSS project...');
      const { dir = _dir } = this.opts<BuildOptions>();
      if (!dir) return logError('Project directory must be provided. Add it as the first argument after build command or use the --dir option.');
      const projectDir = resolveProjectDir(dir);
      await generateCss(projectDir);
    });

  interface GenerateOptions {
    file: string;
    dir: string;
    tag: string;
    name?: string;
    className?: string;
    reactComponent?: boolean;
  }

  program
    .command('generate [file] [directory]')
    .alias('g')
    .description('Generate a new component file.')
    .option('-f, --file <file>', 'File to generate.')
    .option('-d, --dir <dir>', 'Project directory to generate the file in.')
    .option('-t, --tag <tag>', 'HTML tag of the component.', 'div')
    .option('-n, --name <name>', 'Name of the component.')
    .option('-c, --className <className>', 'CSS class of the component.')
    .option('-rc, --reactComponent <rc>', 'Generate a React component as well.')
    .action(async function (this: Command, _file: string, _dir = defaultProject) {
      const { file = _file, dir = _dir, tag, name, className, reactComponent = false } = this.opts<GenerateOptions>();
      if (!file) return logError('File to generate must be provided. Add it as the first argument after generate command or use the --file option.');
      if (!dir) return logError('Project directory must be provided. Add it as the second argument after generate command or use the --dir option.');

      const projectDir = resolveProjectDir(dir);

      const additionalFolders = file.split('/').slice(0, -1).join('/');
      if (additionalFolders) await mkdir(join(projectDir, additionalFolders), { recursive: true });

      const filePath = join(projectDir, file);
      const parsedFilePath = parsePath(filePath);
      if (!parsedFilePath.ext) {
        parsedFilePath.ext = '.ts';
      }
      if (!parsedFilePath.name.endsWith('.css')) {
        parsedFilePath.name = parsedFilePath.name + '.css';
      }
      parsedFilePath.base = parsedFilePath.name + parsedFilePath.ext;
      const formattedStyledFilePath = formatPath(parsedFilePath);

      const alreadyExists = await readFile(formattedStyledFilePath, 'utf-8').catch(() => undefined);
      if (alreadyExists !== undefined) {
        logger.error('File already exists:', formattedStyledFilePath);
        return;
      }

      let styledComponentName = pascalCase(name || parsedFilePath.base.replace(/\.css\.\w+$/, ''));
      if (reactComponent) {
        const componentName = styledComponentName + 'Component';
        styledComponentName = styledComponentName + 'Wrapper';
        const fileName = parsedFilePath.base.replace(/\.css\.\w+$/, '');
        const { content: reactContent } = await readTemplate('react/react-vanilla-file.ts', { tag, componentName, styledComponentName, className, fileName });

        parsedFilePath.name = fileName.replace(/\.css$/, '');
        parsedFilePath.ext = '.tsx';
        parsedFilePath.base = parsedFilePath.name + parsedFilePath.ext;
        const formattedReactFilePath = formatPath(parsedFilePath);
        logger.info('Generating a new file: ' + formattedReactFilePath);
        await writeFile(formattedReactFilePath, reactContent);
        await formatWithPrettier(formattedReactFilePath);
      }
      const { content } = await readTemplate('react/react-styled-file.ts', { tag, name: styledComponentName, className });
      logger.info('Generating a new file: ' + formattedStyledFilePath);
      await writeFile(formattedStyledFilePath, content);

      await formatWithPrettier(formattedStyledFilePath);
    });

  interface UpdateOptions {
    version?: string;
    legacyPeerDeps: boolean;
  }

  program
    .command('update [version]')
    .alias('up')
    .description('Update Salty-CSS packages to the latest or specified version.')
    .option('-v, --version <version>', 'Version to update to.')
    .option('--legacy-peer-deps <legacyPeerDeps>', 'Use legacy peer dependencies (not recommended).', false)
    .action(async function (this: Command, _version = 'latest') {
      const { legacyPeerDeps, version = _version } = this.opts<UpdateOptions>();
      const packageJSONPath = join(process.cwd(), 'package.json');
      const packageJson = await readPackageJson(packageJSONPath).catch((err) => logError(err));
      if (!packageJson) return;
      const allDependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      const saltyCssPackages = Object.keys(allDependencies).filter((dep) => dep === 'salty-css' || dep.startsWith('@salty-css/'));
      if (!saltyCssPackages.length) {
        return logError(
          'No Salty-CSS packages found in package.json. Make sure you are running update command in the same directory! Used package.json path: ' +
            packageJSONPath
        );
      }
      const packagesToUpdate = saltyCssPackages.map((dep) => {
        if (version === '@') return `${dep}@${currentPackageJson.version}`;
        return `${dep}@${version.replace(/^@/, '')}`;
      });

      if (legacyPeerDeps) {
        logger.warn('Using legacy peer dependencies to update packages.');
        await npmInstall(...packagesToUpdate, '--legacy-peer-deps');
      } else {
        await npmInstall(...packagesToUpdate);
      }

      logger.info('Salty-CSS packages updated successfully!');
    });

  program.option('-v, --version', 'Show the current version of Salty-CSS.').action(async function () {
    const currentPackageJson = await readThisPackageJson();
    logger.info('CLI is running: ' + currentPackageJson.version);

    const packageJSONPath = join(process.cwd(), 'package.json');
    const packageJson = await readPackageJson(packageJSONPath).catch((err) => logError(err));
    if (!packageJson) return;
    const allDependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const saltyCssPackages = Object.keys(allDependencies).filter((dep) => dep === 'salty-css' || dep.startsWith('@salty-css/'));
    if (!saltyCssPackages.length) {
      return logError(
        'No Salty-CSS packages found in package.json. Make sure you are running update command in the same directory! Used package.json path: ' +
          packageJSONPath
      );
    }
    for (const dep of saltyCssPackages) {
      logger.info(`${dep}: ${allDependencies[dep]}`);
    }
  });

  program.parseAsync(process.argv);
}
