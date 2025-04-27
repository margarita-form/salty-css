/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as esbuild from 'esbuild';
import { execSync } from 'child_process';
import { toHash } from '../util/to-hash';
import { join, parse as parsePath } from 'path';
import { statSync, existsSync, mkdirSync, readdirSync, writeFileSync, readFileSync } from 'fs';
import { dashCase } from '../util/dash-case';
import { readFile } from 'fs/promises';
import { parseAndJoinStyles } from '../parsers/parse-styles';
import { getTemplateTypes, parseTemplates } from '../parsers/parse-templates';
import { CachedConfig, CssConditionalVariables, CssResponsiveVariables, CssTemplates, SaltyConfig, SaltyVariables } from '../config';
import { parseVariableTokens } from '../parsers/parse-tokens';
import { detectCurrentModuleType } from '../util/module-type';
import { logger } from '../bin/logger';
import { dotCase } from '../util/dot-case';
import { saltyReset } from '../templates/salty-reset';
import { RCFile } from '../types/cli-types';
import { mergeFactories, mergeObjects } from '../css';
import { defineTemplates, GlobalStylesFactory, TemplatesFactory, VariablesFactory } from '../factories';
import { StyledGenerator, ClassNameGenerator } from '../generators';
import { StylesGenerator } from '../generators/styles-generator';
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

interface Cache {
  externalModules: string[];
  rcFile?: RCFile;
  destDir?: string;
}

export const getCorePackageRoot = () => {
  let { pathname } = new URL(import.meta.url);
  while (/core\/?(src\/)?$/.test(pathname) === false) {
    pathname = join(pathname, '../');
  }
  return pathname;
};

const cache: Cache = {
  externalModules: [],
  rcFile: undefined,
  destDir: undefined,
};

const getExternalModules = (coreConfigPath: string) => {
  if (cache.externalModules.length > 0) return cache.externalModules;
  const content = readFileSync(coreConfigPath, 'utf8');
  const match = content.match(/externalModules:\s?\[(.*)\]/);
  if (!match) return [];
  const externalModules = match[1].split(',').map((d) => d.replace(/['"`]/g, '').trim());
  cache.externalModules = externalModules;
  return externalModules;
};

const getDestDir = async (dirname: string) => {
  if (cache.destDir) return cache.destDir;
  const projectConfig = await getRCProjectConfig(dirname);
  const destDir = join(dirname, projectConfig?.saltygenDir || 'saltygen');
  cache.destDir = destDir;
  return destDir;
};

export const saltyFileExtensions = ['salty', 'css', 'styles', 'styled'];
export const saltyFileRegExp = (additional: string[] = []) => new RegExp(`\\.(${[...saltyFileExtensions, ...additional].join('|')})\\.`);
export const isSaltyFile = (file: string, additional: string[] = []) => saltyFileRegExp(additional).test(file);

const readRCFile = async (currentDir: string) => {
  if (cache.rcFile) return cache.rcFile;
  if (currentDir === '/') throw new Error('Could not find .saltyrc.json file');
  const rcPath = join(currentDir, '.saltyrc.json');
  const rcContent = await readFile(rcPath, 'utf-8')
    .then(JSON.parse)
    .catch(() => undefined);

  if (!rcContent) return readRCFile(join(currentDir, '..'));
  cache.rcFile = rcContent;
  return rcContent as RCFile;
};

const getRCProjectConfig = async (dirname: string) => {
  const rcFile = await readRCFile(dirname);
  const projectConfig = rcFile.projects?.find((project) => dirname.endsWith(project.dir || ''));
  if (!projectConfig) return rcFile.projects?.find((project) => project.dir === rcFile.defaultProject);
  return projectConfig;
};

const generateConfig = async (dirname: string) => {
  const rcProject = await getRCProjectConfig(dirname);
  const destDir = await getDestDir(dirname);
  const coreConfigPath = join(dirname, rcProject?.configDir || '', 'salty.config.ts');
  const coreConfigDest = join(destDir, 'salty.config.js');

  const moduleType = await detectCurrentModuleType(dirname);
  const externalModules = getExternalModules(coreConfigPath);
  await esbuild.build({
    entryPoints: [coreConfigPath],
    minify: true,
    treeShaking: true,
    bundle: true,
    outfile: coreConfigDest,
    format: moduleType,
    external: externalModules,
  });

  const now = Date.now();
  const { config } = await import(`${coreConfigDest}?t=${now}`);
  return { config, path: coreConfigDest };
};

export const generateConfigStyles = async (dirname: string, configFiles: Set<string>) => {
  const destDir = await getDestDir(dirname);

  const generationResults: ConfigGenerationResults = {
    mediaQueries: [],
    globalStyles: [],
    variables: [],
    templates: [],
  };

  await Promise.all(
    [...configFiles].map(async (src) => {
      const { contents, outputFilePath } = await compileSaltyFile(dirname, src, destDir);
      Object.entries(contents).forEach(([name, value]) => {
        if (value.isMedia) generationResults.mediaQueries.push([name, value as any]);
        else if (value.isGlobalDefine) generationResults.globalStyles.push(value as any);
        else if (value.isDefineVariables) generationResults.variables.push(value as any);
        else if (value.isDefineTemplates) generationResults.templates.push((value as any)._setPath(`${name};;${outputFilePath}`));
      });
    })
  );

  // Generate the config files
  const { config, path: configPath } = await generateConfig(dirname);

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

  const getStaticVariables = (variables: SaltyVariables): Record<string, any> => {
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
  type VariableTokens = ${tsVariableTokens}; 
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

const replaceStyledTag = (currentFile: string) => {
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

const addConfigCache = (currentFile: string, dirname: string) => {
  try {
    const saltyCachedConfig = readFileSync(join(dirname, 'saltygen/cache/config-cache.json'), 'utf8');
    if (!saltyCachedConfig) return `globalThis.saltyConfig = {};\n\n${currentFile}`;
    return `globalThis.saltyConfig = ${saltyCachedConfig};\n\n${currentFile}`;
  } catch {
    return currentFile;
  }
};

export const compileSaltyFile = async (dirname: string, sourceFilePath: string, outputDirectory: string) => {
  const hashedName = toHash(sourceFilePath);
  const tempDir = join(outputDirectory, './temp');

  if (!existsSync(tempDir)) mkdirSync(tempDir);

  const parsed = parsePath(sourceFilePath);
  let currentFile = readFileSync(sourceFilePath, 'utf8');

  currentFile = replaceStyledTag(currentFile);
  currentFile = addConfigCache(currentFile, dirname);

  const outputFilePath = join(outputDirectory, 'js', hashedName + '.js');
  const rcProject = await getRCProjectConfig(dirname);
  const coreConfigPath = join(dirname, rcProject?.configDir || '', 'salty.config.ts');
  const externalModules = getExternalModules(coreConfigPath);
  const moduleType = await detectCurrentModuleType(dirname);

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
            const modified = replaceStyledTag(original);
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

  const now = Date.now();
  const contents = (await import(`${outputFilePath}?t=${now}`)) as Contents;

  return { contents, outputFilePath };
};

const getConfigCache = async (dirname: string) => {
  const destDir = await getDestDir(dirname);
  const coreConfigDest = join(destDir, 'cache/config-cache.json');
  const contents = readFileSync(coreConfigDest, 'utf8');
  if (!contents) throw new Error('Could not find config cache file');
  return JSON.parse(contents);
};

const getConfig = async (dirname: string) => {
  const cached = await getConfigCache(dirname);
  const destDir = await getDestDir(dirname);
  const coreConfigDest = join(destDir, 'salty.config.js');
  const now = Date.now();
  const { config } = await import(`${coreConfigDest}?t=${now}`);
  return mergeObjects<SaltyConfig & CachedConfig>(config, cached);
};

const isProduction = () => {
  try {
    return process.env['NODE_ENV'] === 'production';
  } catch {
    return false;
  }
};

export const generateCss = async (dirname: string, prod = isProduction(), clean = true) => {
  try {
    const start = Date.now();
    if (prod) logger.info('Generating CSS in production mode! 🔥');
    else logger.info('Generating CSS in development mode! 🚀');

    const globalCssFiles: string[] = [];
    const cssFiles: string[][] = [];
    const destDir = await getDestDir(dirname);
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
    await collectFiles(dirname);

    // Generate variables
    await generateConfigStyles(dirname, configFiles);

    const generationResults: StylesGenerationResults = {
      keyframes: [],
      components: [],
      classNames: [],
    };

    await Promise.all(
      [...files].map(async (src) => {
        const { contents } = await compileSaltyFile(dirname, src, destDir);
        for (let [name, value] of Object.entries(contents)) {
          if (value instanceof Promise) value = await value;

          if (value.isKeyframes) {
            generationResults.keyframes.push({
              value: value as any,
              src,
              name,
            });
          } else if (value.isClassName) {
            generationResults.classNames.push({
              ...value,
              src,
              name,
            });
          } else if (value.generator) {
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
    const config = await getConfig(dirname);

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
        isProduction: prod,
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
        isProduction: prod,
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

export const generateFile = async (dirname: string, file: string, prod = isProduction()) => {
  try {
    const destDir = await getDestDir(dirname);
    const validFile = isSaltyFile(file);

    if (validFile) {
      const cssFiles: string[][] = [];
      const config = await getConfig(dirname);
      const { contents } = await compileSaltyFile(dirname, file, destDir);
      for (const [name, value] of Object.entries(contents)) {
        // Object.entries(contents).forEach(([name, value]: [string, any]) => {
        if (value.isKeyframes && value.css) {
          const fileName = `a_${value.animationName}.css`;
          const filePath = `css/${fileName}`;
          const cssPath = join(destDir, filePath);

          writeFileSync(cssPath, await value.css);
          continue;
        }

        if (value.isClassName) {
          const generator = value.generator._withBuildContext({
            callerName: name,
            isProduction: prod,
            config,
          });

          const styles = await generator.css;
          if (!styles) continue;

          if (!cssFiles[generator.priority]) cssFiles[generator.priority] = [];
          cssFiles[generator.priority].push(generator.cssFileName);

          const filePath = `css/${generator.cssFileName}`;
          const cssPath = join(destDir, filePath);
          writeFileSync(cssPath, styles);
          continue;
        }

        if (!value.generator) continue;

        const generator = value.generator._withBuildContext({
          callerName: name,
          isProduction: prod,
          config,
        });

        const styles = await generator.css;
        if (!styles) continue;

        const filePath = `css/${generator.cssFileName}`;
        const cssPath = join(destDir, filePath);

        writeFileSync(cssPath, styles);

        if (!cssFiles[generator.priority]) cssFiles[generator.priority] = [];
        cssFiles[generator.priority].push(generator.cssFileName);
      }

      if (config.importStrategy !== 'component') {
        cssFiles.forEach((val, layer) => {
          const layerFileName = `l_${layer}.css`;
          const layerFilePath = join(destDir, 'css', layerFileName);
          let currentLayerFileContent = readFileSync(layerFilePath, 'utf8');
          val.forEach((file) => {
            const filepath = join(destDir, 'css', file);
            const filepathHash = /.*-([^-]+)-\d+.css/.exec(file)?.at(1) || toHash(filepath, 6);
            const found = currentLayerFileContent.includes(filepathHash);
            if (!found) {
              const css = readFileSync(filepath, 'utf8');
              const newContent = `/*start:${filepathHash}-${file}*/\n${css}\n/*end:${filepathHash}*/\n`;
              currentLayerFileContent = `${currentLayerFileContent.replace(/\}$/, '')}\n${newContent}\n}`;
            }
          });
          writeFileSync(layerFilePath, currentLayerFileContent);
        });
      } else {
        const cssContent = cssFiles
          .flat()
          .map((file) => `@import url('./${file}');`)
          .join('\n');

        const hashName = toHash(file, 6);
        const parsedPath = parsePath(file);
        const dasherized = dashCase(parsedPath.name);

        const cssFile = join(destDir, `css/f_${dasherized}-${hashName}.css`);
        writeFileSync(cssFile, cssContent || `/* Empty file */`);
      }
    }
  } catch (e) {
    console.error(e);
  }
};

export const minimizeFile = async (dirname: string, file: string, prod = isProduction()) => {
  try {
    const destDir = await getDestDir(dirname);
    const validFile = isSaltyFile(file);

    if (validFile) {
      const original = readFileSync(file, 'utf8');

      const config = await getConfig(dirname);
      const { contents } = await compileSaltyFile(dirname, file, destDir);

      let current = original;

      for (const [name, value] of Object.entries(contents)) {
        if (value.isKeyframes) continue;

        if (!value.generator) continue;
        const generator = value.generator._withBuildContext({
          callerName: name,
          isProduction: prod,
          config,
        });

        const [start, end] = await getFunctionRange(current, name);
        const range = current.slice(start, end);

        if (value.isClassName) {
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
