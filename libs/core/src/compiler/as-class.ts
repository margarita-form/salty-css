import * as esbuild from 'esbuild';
import { join, parse as parsePath } from 'path';
import { logger } from '../bin/logger';
import { RCFile } from '../types/cli-types';
import { readFile } from 'fs/promises';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { getCorePackageRoot, isSaltyFile, resolveExportValue, saltyFileExtensions } from './helpers';
import { defineTemplates, GlobalStylesFactory, TemplatesFactory, VariablesFactory } from '../factories';
import { ClassNameGenerator, StyledGenerator } from '../generators';
import { dashCase, toHash } from '../util';
import { mergeFactories, mergeObjects } from '../css';
import { CachedConfig, CssConditionalVariables, CssResponsiveVariables, CssTemplates, SaltyConfig, SaltyVariables } from '../config';
import { detectCurrentModuleType } from '../util/module-type';
import { StylesGenerator } from '../generators/styles-generator';
import { dotCase } from '../util/dot-case';
import { getTemplateTypes, parseAndJoinStyles, parseTemplates, parseVariableTokens } from '../parsers';
import { saltyReset } from '../templates/salty-reset';
import console from 'console';
import { getFunctionRange } from './get-function-range';

interface GeneratorResult<V extends StylesGenerator> {
  generator: V;
  src: string;
  name: string;
}

interface FunctionResult<V extends object> {
  value: V;
  src: string;
  name: string;
}

interface ConfigGenerationResults {
  mediaQueries: [string, string][];
  globalStyles: GlobalStylesFactory[];
  variables: VariablesFactory[];
  templates: TemplatesFactory[];
}

interface StylesGenerationResults {
  components: GeneratorResult<StyledGenerator>[];
  classNames: GeneratorResult<ClassNameGenerator>[];
  keyframes: FunctionResult<{ animationName: string; css: string }>[];
}

export class SaltyCompiler {
  public importFile = (path: string) => {
    const now = Date.now();
    return import(/* @vite-ignore */ `${path}?t=${now}`);
  };

  private cache = {
    rcFile: null as null | RCFile,
    destDir: null as null | string,
    externalModules: [] as string[],
  };

  constructor(public projectRootDir: string) {
    if (typeof process === 'undefined') {
      throw new Error('SaltyServer can only be used in a Node.js environment.');
    }
  }

  private get isProduction(): boolean {
    try {
      return process.env['NODE_ENV'] !== 'development';
    } catch {
      return false;
    }
  }

  /**
   * Locate and read the .saltyrc.json file starting from the current directory and moving up the directory tree.
   * Caches the result to avoid redundant file reads.
   */
  private readRCFile = async (currentDir = this.projectRootDir): Promise<RCFile> => {
    if (this.cache.rcFile) return this.cache.rcFile;
    if (currentDir === '/') throw new Error('Could not find .saltyrc.json file');
    const rcPath = join(currentDir, '.saltyrc.json');
    const rcContent = await readFile(rcPath, 'utf-8')
      .then(JSON.parse)
      .catch(() => undefined);

    if (!rcContent) return this.readRCFile(join(currentDir, '..'));
    this.cache.rcFile = rcContent;
    return rcContent as RCFile;
  };

  /**
   * Get the project configuration from the .saltyrc.json file based on the current directory.
   * If no specific project configuration is found, it falls back to the default project.
   */
  private getRCProjectConfig = async (dirname: string) => {
    const rcFile = await this.readRCFile(dirname);
    const projectConfig = rcFile.projects?.find((project) => dirname.endsWith(project.dir || ''));
    if (!projectConfig) return rcFile.projects?.find((project) => project.dir === rcFile.defaultProject);
    return projectConfig;
  };

  private getExternalModules = (coreConfigPath: string) => {
    if (this.cache.externalModules.length > 0) return this.cache.externalModules;
    const content = readFileSync(coreConfigPath, 'utf8');
    const match = content.match(/externalModules:\s?\[(.*)\]/);
    if (!match) return [];
    const externalModules = match[1].split(',').map((d) => d.replace(/['"`]/g, '').trim());
    this.cache.externalModules = externalModules;
    return externalModules;
  };

  /**
   * Get the destination directory for generated files based on the project configuration.
   * Caches the result to avoid redundant computations.
   */
  private getDestDir = async () => {
    if (this.cache.destDir) return this.cache.destDir;
    const projectConfig = await this.getRCProjectConfig(this.projectRootDir);
    const destDir = join(this.projectRootDir, projectConfig?.saltygenDir || 'saltygen');
    this.cache.destDir = destDir;
    return destDir;
  };

  private generateConfig = async () => {
    const rcProject = await this.getRCProjectConfig(this.projectRootDir);
    const destDir = await this.getDestDir();
    const coreConfigPath = join(this.projectRootDir, rcProject?.configDir || '', 'salty.config.ts');
    const coreConfigDest = join(destDir, 'salty.config.js');

    const moduleType = await detectCurrentModuleType(this.projectRootDir);
    const externalModules = this.getExternalModules(coreConfigPath);
    await esbuild.build({
      entryPoints: [coreConfigPath],
      minify: true,
      treeShaking: true,
      bundle: true,
      outfile: coreConfigDest,
      format: moduleType,
      external: externalModules,
    });

    const { config } = await this.importFile(coreConfigDest);
    return { config, path: coreConfigDest };
  };

  private addConfigCache = (currentFile: string) => {
    try {
      const saltyCachedConfig = readFileSync(join(this.projectRootDir, 'saltygen/cache/config-cache.json'), 'utf8');
      if (!saltyCachedConfig) return `globalThis.saltyConfig = {};\n\n${currentFile}`;
      return `globalThis.saltyConfig = ${saltyCachedConfig};\n\n${currentFile}`;
    } catch {
      return currentFile;
    }
  };

  private getConfigCache = async () => {
    const destDir = await this.getDestDir();
    const coreConfigDest = join(destDir, 'cache/config-cache.json');
    const contents = readFileSync(coreConfigDest, 'utf8');
    if (!contents) throw new Error('Could not find config cache file');
    return JSON.parse(contents);
  };

  private getConfig = async () => {
    const cached = await this.getConfigCache();
    const destDir = await this.getDestDir();
    const coreConfigDest = join(destDir, 'salty.config.js');
    const { config } = await this.importFile(coreConfigDest);
    return mergeObjects<SaltyConfig & CachedConfig>(config, cached);
  };

  /**
   * Generate CSS files based on the Salty CSS configuration and source files.
   */
  public generateCss = async (clean = true) => {
    try {
      const start = Date.now();
      if (this.isProduction) logger.info('Generating CSS in production mode! 🔥');
      else logger.info('Generating CSS in development mode! 🚀');

      const globalCssFiles: string[] = [];
      const cssFiles: string[][] = [];
      const destDir = await this.getDestDir();
      const cssFile = join(destDir, 'index.css');

      const clearDistDir = () => {
        if (existsSync(destDir)) execSync('rm -rf ' + destDir);
        mkdirSync(destDir, { recursive: true });
        mkdirSync(join(destDir, 'css'));
        mkdirSync(join(destDir, 'types'));
        mkdirSync(join(destDir, 'js'));
        mkdirSync(join(destDir, 'cache'));
      };

      // Clear the dist directory

      if (clean) clearDistDir();

      // Collect salty css files
      const files = new Set<string>();
      const configFiles = new Set<string>();

      async function collectFiles(src: string) {
        const foldersToSkip = ['node_modules', 'saltygen'];
        const stats = statSync(src);

        if (stats.isDirectory()) {
          const files = readdirSync(src);
          const shouldSkip = foldersToSkip.some((folder) => src.includes(folder));
          if (shouldSkip) return;
          await Promise.all(files.map((file) => collectFiles(join(src, file))));
        } else if (stats.isFile()) {
          const validFile = isSaltyFile(src);

          if (validFile) {
            files.add(src);
            const contents = readFileSync(src, 'utf8');
            const hasDefineFunction = /define[\w\d]+\(/.test(contents);
            if (hasDefineFunction) configFiles.add(src);
          }
        }
      }
      // Start the copying process
      await collectFiles(this.projectRootDir);

      // Generate variables
      await this.generateConfigStyles(configFiles);

      const generationResults: StylesGenerationResults = {
        keyframes: [],
        components: [],
        classNames: [],
      };

      await Promise.all(
        [...files].map(async (src) => {
          const { contents } = await this.compileSaltyFile(src, destDir);
          for (const [name, value] of Object.entries(contents)) {
            const resolved = await resolveExportValue<any>(value, 1);

            if (resolved.isKeyframes) {
              generationResults.keyframes.push({
                value: resolved as any,
                src,
                name,
              });
            } else if (resolved.isClassName) {
              generationResults.classNames.push({
                ...value,
                src,
                name,
              });
            } else if (resolved.generator) {
              generationResults.components.push({
                ...value,
                src,
                name,
              });
            }
          }
        })
      );

      // Get config
      const config = await this.getConfig();

      // Generate CSS for keyframe animations
      for (const keyframes of generationResults.keyframes) {
        const { value } = keyframes;
        const fileName = `a_${value.animationName}.css`;
        const filePath = `css/${fileName}`;
        const cssPath = join(destDir, filePath);
        globalCssFiles.push(fileName);

        writeFileSync(cssPath, value.css);
      }

      // Start gathering CSS files for components
      const localCssFiles: Record<string, string[]> = {};

      // Generate CSS for components
      for (const componentResult of generationResults.components) {
        const { src, name } = componentResult;
        if (!localCssFiles[src]) localCssFiles[src] = [];

        const generator = componentResult.generator._withBuildContext({
          callerName: name,
          isProduction: this.isProduction,
          config,
        });

        if (!cssFiles[generator.priority]) cssFiles[generator.priority] = [];
        const styles = await generator.css;
        if (!styles) continue;

        cssFiles[generator.priority].push(generator.cssFileName);

        const filePath = `css/${generator.cssFileName}`;
        const cssPath = join(destDir, filePath);

        writeFileSync(cssPath, styles);

        if (config.importStrategy === 'component') {
          localCssFiles[src].push(generator.cssFileName);
        }
      }

      // Generate CSS for class names
      for (const classNameResult of generationResults.classNames) {
        const { src, name } = classNameResult;
        if (!localCssFiles[src]) localCssFiles[src] = [];

        const generator = classNameResult.generator._withBuildContext({
          callerName: name,
          isProduction: this.isProduction,
          config,
        });

        const styles = await generator.css;
        if (!styles) continue;

        if (!cssFiles[generator.priority]) cssFiles[generator.priority] = [];
        cssFiles[generator.priority].push(generator.cssFileName);

        const filePath = `css/${generator.cssFileName}`;
        const cssPath = join(destDir, filePath);

        writeFileSync(cssPath, styles);

        if (config.importStrategy === 'component') {
          localCssFiles[src].push(generator.cssFileName);
        }
      }

      // Generate CSS files for component import
      if (config.importStrategy === 'component') {
        Object.entries(localCssFiles).forEach(([src, localCssFile]) => {
          const cssContent = localCssFile.map((file) => `@import url('./${file}');`).join('\n');

          const hashName = toHash(src, 6);
          const parsedPath = parsePath(src);
          const dasherized = dashCase(parsedPath.name);

          const cssFile = join(destDir, `css/f_${dasherized}-${hashName}.css`);
          writeFileSync(cssFile, cssContent || `/* Empty file */`);
        });
      }

      const otherGlobalCssFiles = globalCssFiles.map((file) => `@import url('./css/${file}');`).join('\n');

      const globalCssFilenames = ['_variables.css', '_reset.css', '_global.css', '_templates.css'];
      const importsWithData = globalCssFilenames.filter((file) => {
        try {
          const data = readFileSync(join(destDir, 'css', file), 'utf8');
          return data.length > 0;
        } catch {
          return false;
        }
      });
      const globalImports = importsWithData.map((file) => `@import url('./css/${file}');`);
      const generatorText = '/*!\n * Generated with Salty CSS (https://salty-css.dev)\n * Do not edit this file directly\n */\n';
      let cssContent = `${generatorText}@layer reset, global, templates, l0, l1, l2, l3, l4, l5, l6, l7, l8;\n\n${globalImports.join(
        '\n'
      )}\n${otherGlobalCssFiles}`;

      if (config.importStrategy !== 'component') {
        const mergedContent = cssFiles.reduce((acc, val, layer) => {
          const layerContent = val.reduce((layerAcc, file) => {
            const filepath = join(destDir, 'css', file);
            const css = readFileSync(filepath, 'utf8');
            const filepathHash = /.*-([^-]+)-\d+.css/.exec(file)?.at(1) || toHash(filepath, 6);
            if (layerAcc.includes(filepathHash)) return layerAcc;
            return `${layerAcc}\n/*start:${filepathHash}-${file}*/\n${css}\n/*end:${filepathHash}*/\n`;
          }, '');

          const layerFileName = `l_${layer}.css`;
          const layerFilePath = join(destDir, 'css', layerFileName);
          const layerContentWithLayer = `@layer l${layer} { ${layerContent}\n }`;
          writeFileSync(layerFilePath, layerContentWithLayer);

          return `${acc}\n@import url('./css/${layerFileName}');`;
        }, '');

        cssContent += mergedContent;
      }

      writeFileSync(cssFile, cssContent);

      const end = Date.now();
      const time = end - start;
      const emoji = time < 200 ? '🔥' : time < 500 ? '🚀' : time < 1000 ? '🎉' : time < 2000 ? '🚗' : time < 5000 ? '🤔' : '🥴';
      logger.info(`Generated CSS in ${time}ms! ${emoji}`);
    } catch (e) {
      console.error(e);
    }
  };

  private generateConfigStyles = async (configFiles: Set<string>) => {
    const destDir = await this.getDestDir();

    const generationResults: ConfigGenerationResults = {
      mediaQueries: [],
      globalStyles: [],
      variables: [],
      templates: [],
    };

    await Promise.all(
      [...configFiles].map(async (src) => {
        const { contents, outputFilePath } = await this.compileSaltyFile(src, destDir);
        Object.entries(contents).forEach(([name, value]) => {
          if (value.isMedia) generationResults.mediaQueries.push([name, value as any]);
          else if (value.isGlobalDefine) generationResults.globalStyles.push(value as any);
          else if (value.isDefineVariables) generationResults.variables.push(value as any);
          else if (value.isDefineTemplates) generationResults.templates.push((value as any)._setPath(`${name};;${outputFilePath}`));
        });
      })
    );

    // Generate the config files
    const { config, path: configPath } = await this.generateConfig();

    // Cache the config content
    const configCacheContent = { ...config } as CachedConfig;

    // Generate media query helpers
    const { mediaQueries } = generationResults;
    configCacheContent.mediaQueries = Object.fromEntries(mediaQueries.map(([name, value]) => [`@${name}`, value]));
    const mediaQueryKeys = mediaQueries.map(([name]) => `'@${name}'`).join(' | ');

    // Generate variables css file
    const variableTokens = new Set<string>();

    type Variables = string | undefined;
    const parseVariables = async <T extends object>(obj: T, path: PropertyKey[] = []): Promise<Variables[]> => {
      if (!obj) return [];
      const promises = Object.entries(obj).map(async ([key, value]): Promise<Variables | Variables[]> => {
        const parseVariable = async (value: unknown) => {
          if (!value) return undefined;
          if (value instanceof Promise) return await parseVariable(await value);
          if (typeof value === 'function') return await parseVariable(await value());
          if (typeof value === 'object') return await parseVariables(value, [...path, key]);

          const dottedKey = dotCase(key);
          const dashedKey = dashCase(key);

          const tsName = [...path, dottedKey].join('.');
          variableTokens.add(`"${tsName}"`);

          const cssName = [...path.map(dashCase), dashedKey].join('-');
          const result = parseVariableTokens(value);
          if (!result) return `--${cssName}: ${value};`;
          return `--${cssName}: ${result.transformed};`;
        };
        return await parseVariable(value);
      });

      const results = await Promise.all(promises);
      return results.flat();
    };

    const parseResponsiveVariables = async <T extends CssResponsiveVariables>(obj: T): Promise<Variables[]> => {
      if (!obj) return [];

      const promises = Object.entries(obj).map(async ([mediaQuery, values]): Promise<Variables | Variables[]> => {
        const variables = await parseVariables(values);
        if (mediaQuery === 'base') return variables.join('');
        if (configCacheContent.mediaQueries[mediaQuery]) {
          const mediaQueryValue = configCacheContent.mediaQueries[mediaQuery];
          return `${mediaQueryValue} { ${variables.join('')} }`;
        }
        return `${mediaQuery} { ${variables.join('')} }`;
      });
      const results = await Promise.all(promises);
      return results.flat();
    };

    const parseConditionalVariables = async <T extends CssConditionalVariables>(obj: T): Promise<Variables[]> => {
      if (!obj) return [];

      const promises = Object.entries(obj).map(async ([property, conditions]): Promise<Variables | Variables[]> => {
        const promises = Object.entries(conditions).map(async ([condition, values]): Promise<Variables | Variables[]> => {
          const variables = await parseVariables(values, [property]);
          const conditionScope = `.${property}-${condition}, [data-${property}="${condition}"]`;
          const combined = variables.join('');
          return `${conditionScope} { ${combined} }`;
        });
        const result = await Promise.all(promises);
        return result.flat();
      });
      const results = await Promise.all(promises);
      return results.flat();
    };

    const getStaticVariables = (variables: SaltyVariables | undefined = {}): Record<string, any> => {
      return { ...variables, responsive: undefined, conditional: undefined };
    };

    const getGeneratedVariables = (type: 'static' | 'responsive' | 'conditional') => {
      return generationResults.variables.map((factory) => {
        if (type === 'static') return getStaticVariables(factory._current);
        return factory._current[type];
      });
    };

    const _staticVariables = mergeObjects(getStaticVariables(config.variables), getGeneratedVariables('static'));
    const staticVariables = await parseVariables(_staticVariables);
    const _responsiveVariables = mergeObjects<CssResponsiveVariables>(config.variables?.responsive, getGeneratedVariables('responsive'));
    const responsiveVariables = await parseResponsiveVariables(_responsiveVariables);
    const _conditionalVariables = mergeObjects(config.variables?.conditional, getGeneratedVariables('conditional'));
    const conditionalVariables = await parseConditionalVariables(_conditionalVariables);

    const variablesPath = join(destDir, 'css/_variables.css');
    const variablesCss = `:root { ${staticVariables.join('')} ${responsiveVariables.join('')} } ${conditionalVariables.join('')}`;
    writeFileSync(variablesPath, variablesCss);
    configCacheContent.staticVariables = _staticVariables;

    // Generate global styles
    const globalStylesPath = join(destDir, 'css/_global.css');
    const mergedGlobalStyles = mergeObjects(config.global, generationResults.globalStyles);
    const globalStylesString = await parseAndJoinStyles(mergedGlobalStyles, '');

    writeFileSync(globalStylesPath, `@layer global { ${globalStylesString} }`);

    // Generate reset styles
    const resetStylesPath = join(destDir, 'css/_reset.css');

    const getResetStyles = () => {
      if (config.reset === 'none') return {};
      if (typeof config.reset === 'object') return config.reset;
      return saltyReset;
    };

    const resetStyles = getResetStyles();
    const resetStylesString = await parseAndJoinStyles(resetStyles, '');

    writeFileSync(resetStylesPath, `@layer reset { ${resetStylesString} }`);

    // Generate templates
    const templateStylesPath = join(destDir, 'css/_templates.css');
    const templates = mergeObjects<CssTemplates>(config.templates, generationResults.templates);

    const templateStylesString = await parseTemplates(templates);
    const templateTokens = getTemplateTypes(templates);

    writeFileSync(templateStylesPath, `@layer templates { ${templateStylesString} }`);
    configCacheContent.templates = templates;

    const configTemplateFactories = config.templates ? [defineTemplates(config.templates)._setPath(`config;;${configPath}`)] : [];
    const templateFactories = mergeFactories(generationResults.templates, configTemplateFactories);

    configCacheContent.templatePaths = Object.fromEntries(Object.entries(templateFactories).map(([key, faktory]) => [key, faktory._path]));

    // Generate types

    const tsTokensPath = join(destDir, 'types/css-tokens.d.ts');
    const tsVariableTokens = [...variableTokens].join('|');

    const tsTokensTypes = `
      // Variable types
      type VariableTokens = ${tsVariableTokens || `''`}; 
      type PropertyValueToken = \`{\${VariableTokens}}\`;
    
      // Template types
      type TemplateTokens = {
        ${Object.entries(templateTokens)
          .map(([key, value]) => `${key}?: ${value}`)
          .join('\n')}
      }
    
      // Media query types
      type MediaQueryKeys = ${mediaQueryKeys || `''`};
      `;

    writeFileSync(tsTokensPath, tsTokensTypes);

    // Save config cache file
    const configCachePath = join(destDir, 'cache/config-cache.json');
    writeFileSync(configCachePath, JSON.stringify(configCacheContent, null, 2));

    const corePackageRoot = getCorePackageRoot();
    const configCacheSecondaryPath = join(corePackageRoot, 'cache/config-cache.json');
    writeFileSync(configCacheSecondaryPath, JSON.stringify(configCacheContent, null, 2));
  };

  public compileSaltyFile = async (sourceFilePath: string, outputDirectory: string) => {
    const hashedName = toHash(sourceFilePath);
    const tempDir = join(outputDirectory, './temp');

    if (!existsSync(tempDir)) mkdirSync(tempDir);

    const parsed = parsePath(sourceFilePath);
    let currentFile = readFileSync(sourceFilePath, 'utf8');

    currentFile = this.replaceStyledTag(currentFile);
    currentFile = this.addConfigCache(currentFile);

    const outputFilePath = join(outputDirectory, 'js', hashedName + '.js');
    const rcProject = await this.getRCProjectConfig(this.projectRootDir);
    const coreConfigPath = join(this.projectRootDir, rcProject?.configDir || '', 'salty.config.ts');
    const externalModules = this.getExternalModules(coreConfigPath);
    const moduleType = await detectCurrentModuleType(this.projectRootDir);

    await esbuild.build({
      stdin: {
        contents: currentFile,
        sourcefile: parsed.base,
        resolveDir: parsed.dir,
        loader: 'tsx',
      },
      minify: false,
      treeShaking: true,
      bundle: true,
      outfile: outputFilePath,
      format: moduleType,
      target: ['node20'],
      keepNames: true,
      external: externalModules,
      packages: 'external',
      plugins: [
        {
          name: 'test',
          setup: (build) => {
            build.onLoad({ filter: /.*\.css|salty|styles|styled\.ts/ }, (args) => {
              const original = readFileSync(args.path, 'utf8');
              const modified = this.replaceStyledTag(original);
              return { contents: modified, loader: 'ts' };
            });
          },
        },
      ],
    });

    type Contents = {
      [key: string]: {
        generator: any;
        isClassName?: boolean;
        isMedia?: boolean;
        isGlobalDefine?: boolean;
        isDefineVariables?: boolean;
        isDefineTemplates?: boolean;
        isKeyframes?: boolean;
        animationName?: string;
        css?: Promise<string>;
        styles?: any;
      };
    };

    const contents = (await this.importFile(outputFilePath)) as Contents;
    return { contents, outputFilePath };
  };

  public minimizeFile = async (file: string) => {
    try {
      const destDir = await this.getDestDir();
      const validFile = isSaltyFile(file);

      if (validFile) {
        const original = readFileSync(file, 'utf8');

        const config = await this.getConfig();
        const { contents } = await this.compileSaltyFile(file, destDir);

        let current = original;

        for (const [name, value] of Object.entries(contents)) {
          const resolved = await resolveExportValue<any>(value, 1);
          if (resolved.isKeyframes) continue;

          if (!resolved.generator) continue;
          const generator = resolved.generator._withBuildContext({
            callerName: name,
            isProduction: this.isProduction,
            config,
          });

          const [start, end] = await getFunctionRange(current, name);
          const range = current.slice(start, end);

          if (resolved.isClassName) {
            const copy = current;
            const clientVersion = ` ${name} = className("${generator.classNames}")`;
            current = current.replace(range, clientVersion);

            if (copy === current) console.error('Minimize file failed to change content', { name });
          }

          if (range.includes('styled')) {
            const tagName = /styled\(([^,]+),/.exec(range)?.at(1)?.trim();

            // Replace the styled call with the client version
            const copy = current;
            const clientVersion = ` ${name} = styled(${tagName}, "${generator.classNames}", ${JSON.stringify(generator.clientProps)})`;
            current = current.replace(range, clientVersion);

            if (copy === current) console.error('Minimize file failed to change content', { name, tagName });
          }
        }

        if (config.importStrategy === 'component') {
          const fileHash = toHash(file, 6);
          const parsed = parsePath(file);
          const dasherized = dashCase(parsed.name);
          const cssFileName = `f_${dasherized}-${fileHash}.css`;
          current = `import '../../saltygen/css/${cssFileName}';\n${current}`;
        }

        current = current.replace(`@salty-css/react/class-name`, `@salty-css/react/class-name-client`);

        current = current.replace(`{ styled }`, `{ styledClient as styled }`);
        current = current.replace(`@salty-css/react/styled`, `@salty-css/react/styled-client`);

        return current;
      }
    } catch (e) {
      console.error('Error in minimizeFile:', e);
    }
    return undefined;
  };

  private replaceStyledTag = (currentFile: string) => {
    return currentFile.replace(/styled\(([^"'`{,]+),/g, (match, tag) => {
      // Check if the tag is a string
      const isString = /^['"`]/.test(tag);
      if (isString) return match;

      // Check if the tag is imported from somewhere else
      const isImportedRegExp = new RegExp(`import[^;]*${tag}[,\\s{][^;]*from\\s?([^{};]+);`);
      const isImported = isImportedRegExp.test(currentFile);
      if (!isImported) return match;

      // Check if the import is a salty file
      const importResult = isImportedRegExp.exec(currentFile);
      if (importResult) {
        const importPath = importResult.at(1);
        const isSaltyImport = saltyFileExtensions.some((ext) => importPath?.includes(ext));
        if (isSaltyImport) return match;
      }

      // To avoid unnecessary imports, we will replace the styled call with a string when import is not a salty file
      return "styled('div',";
    });
  };
}
