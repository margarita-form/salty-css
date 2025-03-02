import * as esbuild from 'esbuild';
import { execSync } from 'child_process';
import { toHash } from '../util/to-hash';
import { join, parse as parsePath } from 'path';
import { statSync, existsSync, mkdirSync, readdirSync, writeFileSync, readFileSync } from 'fs';
import { StyleComponentGenerator } from '../generator/style-generator';
import { dashCase } from '../util/dash-case';
import { readFile, writeFile } from 'fs/promises';
import { parseStyles } from '../generator/parse-styles';
import { getTemplateTypes, parseTemplates } from '../generator/parse-templates';
import { CssConditionalVariables, CssResponsiveVariables, SaltyConfig, SaltyVariables } from '../config';
import { parseValueTokens } from '../generator/parse-tokens';
import { detectCurrentModuleType } from '../util/module-type';
import { logger } from '../bin/logger';
import { dotCase } from '../util/dot-case';
import { saltyReset } from '../templates/salty-reset';
import { MediaQueryFactory } from '../css/media';
import { RCFile } from '../types/cli-types';
import { ClassNameFactory, mergeStyles } from '../css';
import { GlobalStylesFactory, TemplatesFactory, VariablesFactory } from '../factories';

interface GeneratorResult<V extends object> {
  value: V;
  src: string;
  name: string;
}

interface GenerationResults {
  components: GeneratorResult<StyleComponentGenerator>[];
  classNames: GeneratorResult<ClassNameFactory>[];
  keyframes: GeneratorResult<{ animationName: string; css: string }>[];
  mediaQueries: MediaQueryFactory[];
  globalStyles: GlobalStylesFactory[];
  variables: VariablesFactory[];
  templates: TemplatesFactory[];
}

interface Cache {
  externalModules: string[];
  rcFile?: RCFile;
  destDir?: string;
}

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
  return config;
};

export const generateConfigStyles = async (dirname: string, generationResults: GenerationResults) => {
  // Generate the config files
  const config = await generateConfig(dirname);

  // Cache the config content
  const configCacheContent = { ...config } as Record<'templates', any>;

  // Generate variables css file
  const variableTokens = new Set<string>();

  type Variables = string | undefined;
  const parseVariables = <T extends object>(obj: T, path: PropertyKey[] = []): Variables[] => {
    if (!obj) return [];
    return Object.entries(obj).flatMap(([key, value]): Variables | Variables[] => {
      if (!value) return undefined;
      if (typeof value === 'object') return parseVariables(value, [...path, key]);

      const dottedKey = dotCase(key);
      const dashedKey = dashCase(key);

      const tsName = [...path, dottedKey].join('.');
      variableTokens.add(`"${tsName}"`);

      const cssName = [...path.map(dashCase), dashedKey].join('-');
      const { result } = parseValueTokens(value);
      return `--${cssName}: ${result};`;
    });
  };

  const parseResponsiveVariables = <T extends CssResponsiveVariables>(obj: T): Variables[] => {
    if (!obj) return [];

    return Object.entries(obj).flatMap(([mediaQuery, values]): Variables | Variables[] => {
      const variables = parseVariables(values);
      if (mediaQuery === 'base') return variables.join('');
      return `${mediaQuery} { ${variables.join('')} }`;
    });
  };

  const parseConditionalVariables = <T extends CssConditionalVariables>(obj: T): Variables[] => {
    if (!obj) return [];

    return Object.entries(obj).flatMap(([property, conditions]): Variables | Variables[] => {
      return Object.entries(conditions).flatMap(([condition, values]): Variables | Variables[] => {
        const variables = parseVariables(values, [property]);
        const conditionScope = `.${property}-${condition}, [data-${property}="${condition}"]`;
        const combined = variables.join('');
        return `${conditionScope} { ${combined} }`;
      });
    });
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

  const staticVariables = parseVariables(mergeStyles(getStaticVariables(config.variables), getGeneratedVariables('static')));
  const responsiveVariables = parseResponsiveVariables(mergeStyles(config.variables?.responsive, getGeneratedVariables('responsive')));
  const conditionalVariables = parseConditionalVariables(mergeStyles(config.variables?.conditional, getGeneratedVariables('conditional')));

  const destDir = await getDestDir(dirname);

  const variablesPath = join(destDir, 'css/_variables.css');
  const variablesCss = `:root { ${staticVariables.join('')} ${responsiveVariables.join('')} } ${conditionalVariables.join('')}`;
  writeFileSync(variablesPath, variablesCss);

  // Generate global styles
  const globalStylesPath = join(destDir, 'css/_global.css');
  const mergedGlobalStyles = mergeStyles(config.global, generationResults.globalStyles);
  const globalStylesString = parseStyles(mergedGlobalStyles, '');

  writeFileSync(globalStylesPath, `@layer global { ${globalStylesString} }`);

  // Generate reset styles
  const resetStylesPath = join(destDir, 'css/_reset.css');

  const getResetStyles = () => {
    if (config.reset === 'none') return {};
    if (typeof config.reset === 'object') return config.reset;
    return saltyReset;
  };

  const resetStyles = getResetStyles();
  const resetStylesString = parseStyles(resetStyles, '');

  writeFileSync(resetStylesPath, `@layer reset { ${resetStylesString} }`);

  // Generate templates
  const templateStylesPath = join(destDir, 'css/_templates.css');
  const templates = mergeStyles(config.templates, generationResults.templates);

  const templateStylesString = parseTemplates(templates);
  const templateTokens = getTemplateTypes(templates);

  writeFileSync(templateStylesPath, templateStylesString);
  configCacheContent.templates = templates;

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
  `;

  writeFileSync(tsTokensPath, tsTokensTypes);

  // Save config cache file
  const configCachePath = join(destDir, 'cache/config-cache.json');
  writeFileSync(configCachePath, JSON.stringify(configCacheContent, null, 2));
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

export const compileSaltyFile = async (dirname: string, sourceFilePath: string, outputDirectory: string) => {
  const hashedName = toHash(sourceFilePath);
  const tempDir = join(outputDirectory, './temp');

  if (!existsSync(tempDir)) mkdirSync(tempDir);

  const parsed = parsePath(sourceFilePath);
  let currentFile = readFileSync(sourceFilePath, 'utf8');

  currentFile = replaceStyledTag(currentFile);

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

  const now = Date.now();
  const contents = await import(`${outputFilePath}?t=${now}`);

  return contents as {
    [key: string]: {
      generator: StyleComponentGenerator;
      isClassName?: boolean;
      isMedia?: boolean;
      isGlobalDefine?: boolean;
      isDefineVariables?: boolean;
      isDefineTemplates?: boolean;
      isKeyframes?: boolean;
      animationName?: string;
      css?: string;
      styles?: any;
    };
  };
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
  return mergeStyles<SaltyConfig>(config, cached);
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

    const generationResults: GenerationResults = {
      keyframes: [],
      mediaQueries: [],
      globalStyles: [],
      variables: [],
      templates: [],
      components: [],
      classNames: [],
    };

    async function generate(src: string) {
      const foldersToSkip = ['node_modules', 'saltygen'];
      const stats = statSync(src);

      if (stats.isDirectory()) {
        const files = readdirSync(src);
        const shouldSkip = foldersToSkip.some((folder) => src.includes(folder));
        if (shouldSkip) return;
        await Promise.all(files.map((file) => generate(join(src, file))));
      } else if (stats.isFile()) {
        const validFile = isSaltyFile(src);

        if (validFile) {
          const contents = await compileSaltyFile(dirname, src, destDir);
          Object.entries(contents).forEach(([name, value]) => {
            if (value.isKeyframes) {
              generationResults.keyframes.push({
                value: value as any,
                src,
                name,
              });
            } else if (value.isMedia) {
              generationResults.mediaQueries.push(value as any);
            } else if (value.isGlobalDefine) {
              generationResults.globalStyles.push(value as any);
            } else if (value.isDefineVariables) {
              generationResults.variables.push(value as any);
            } else if (value.isDefineTemplates) {
              generationResults.templates.push(value as any);
            } else if (value.isClassName) {
              generationResults.classNames.push({
                value: value.factory,
                src,
                name,
              });
            } else if (value.generator) {
              generationResults.components.push({
                value: value.generator,
                src,
                name,
              });
            }
          });
        }
      }
    }
    // Start the copying process
    await generate(dirname);

    // Generate variables
    await generateConfigStyles(dirname, generationResults);

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
    for (const component of generationResults.components) {
      const { value, name, src } = component;
      const generator = value._withBuildContext({
        name,
        config,
        prod,
      });

      if (!cssFiles[generator.priority]) cssFiles[generator.priority] = [];
      cssFiles[generator.priority].push(generator.cssFileName);

      const filePath = `css/${generator.cssFileName}`;
      const cssPath = join(destDir, filePath);
      writeFileSync(cssPath, generator.css);

      if (config.importStrategy === 'component') {
        if (!localCssFiles[src]) localCssFiles[src] = [generator.cssFileName];
        else localCssFiles[src].push(generator.cssFileName);
      }
    }

    // Generate CSS for class names
    for (const classNameResult of generationResults.classNames) {
      const { value, src, name } = classNameResult;
      const generator = value._withBuildContext({
        name,
        prod,
      });

      cssFiles[0].push(generator.cssFileName);

      const filePath = `css/${generator.cssFileName}`;
      const cssPath = join(destDir, filePath);
      writeFileSync(cssPath, generator.css);

      if (config.importStrategy === 'component') {
        if (!localCssFiles[src]) localCssFiles[src] = [generator.cssFileName];
        else localCssFiles[src].push(generator.cssFileName);
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
        writeFileSync(cssFile, cssContent);
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
    let cssContent = `@layer reset, global, l0, l1, l2, l3, l4, l5, l6, l7, l8;\n\n${globalImports.join('\n')}\n${otherGlobalCssFiles}`;

    if (config.importStrategy !== 'component') {
      const mergedContent = cssFiles.reduce((acc, val, layer) => {
        const layerContent = val.reduce((layerAcc, file) => {
          const filepath = join(destDir, 'css', file);
          const css = readFileSync(filepath, 'utf8');
          const filepathHash = /.*-([^-]+)-\d+.css/.exec(file)?.at(1) || toHash(filepath, 6);
          if (layerAcc.includes(filepathHash)) return layerAcc;
          return `${layerAcc}\n/*start:${filepathHash}*/\n${css}\n/*end:${filepathHash}*/\n`;
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

export const generateFile = async (dirname: string, file: string) => {
  try {
    const destDir = await getDestDir(dirname);
    const validFile = isSaltyFile(file);

    if (validFile) {
      const cssFiles: string[][] = [];
      const config = await getConfig(dirname);
      const contents = await compileSaltyFile(dirname, file, destDir);
      Object.entries(contents).forEach(([name, value]: [string, any]) => {
        if (value.isKeyframes && value.css) {
          const fileName = `a_${value.animationName}.css`;
          const filePath = `css/${fileName}`;
          const cssPath = join(destDir, filePath);

          writeFileSync(cssPath, value.css);

          return;
        }

        if (value.isClassName) {
          const generator = value.factory._withBuildContext({
            name,
          });

          cssFiles[0].push(generator.cssFileName);

          const filePath = `css/${generator.cssFileName}`;
          const cssPath = join(destDir, filePath);
          writeFileSync(cssPath, generator.css);
        }

        if (!value.generator) return;

        const generator = value.generator._withBuildContext({
          name,
          config,
        });

        const filePath = `css/${generator.cssFileName}`;
        const cssPath = join(destDir, filePath);

        writeFileSync(cssPath, generator.css);

        if (!cssFiles[generator.priority]) cssFiles[generator.priority] = [];
        cssFiles[generator.priority].push(generator.cssFileName);
      });

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
              const newContent = `/*start:${filepathHash}*/\n${css}\n/*end:${filepathHash}*/\n`;
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

        writeFileSync(cssFile, cssContent);
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

      const copy = original.replace(/^(?!export\s)const\s.*/gm, (original) => `export ${original}`);

      if (copy !== original) await writeFile(file, original);

      const config = await getConfig(dirname);
      const contents = await compileSaltyFile(dirname, file, destDir);

      let current = original;
      Object.entries(contents).forEach(([name, value]) => {
        if (value.isKeyframes) return;
        if (!value.generator) return;

        const generator = value.generator._withBuildContext({
          name,
          config,
          prod,
        });

        const regexpResult = new RegExp(`\\s${name}[=\\s]+[^()]+styled\\(([^,]+),`, 'g').exec(original);
        if (!regexpResult) return console.error('Could not find the original declaration');
        const tagName = regexpResult.at(1)?.trim();

        const matches = new RegExp(`\\s${name}[=\\s]+styled\\(`, 'g').exec(current);
        if (!matches) return console.error('Could not find the original declaration');
        const { index: rangeStart } = matches;

        let forceStop = false;
        const timeout = setTimeout(() => (forceStop = true), 5000);

        let currentIndex = 0;
        let endBracketFound = false;
        let innerBracketCount = 0;

        // Find the end of the styled call
        while (!endBracketFound && !forceStop) {
          const char = current[rangeStart + currentIndex];
          if (char === '(') innerBracketCount++;
          if (char === ')') innerBracketCount--;
          if (innerBracketCount === 0 && char === ')') endBracketFound = true;
          if (currentIndex > current.length) forceStop = true;
          currentIndex++;
        }

        if (!forceStop) clearTimeout(timeout);
        else throw new Error('Failed to find the end of the styled call and timed out');

        const rangeEnd = rangeStart + currentIndex;
        const range = current.slice(rangeStart, rangeEnd);

        // Replace the styled call with the client version
        const copy = current;
        const clientVersion = ` ${name} = styled(${tagName}, "${generator.classNames}", ${JSON.stringify(generator.props)});`;
        current = current.replace(range, clientVersion);

        if (copy === current) console.error('Minimize file failed to change content', { name, tagName });
      });

      if (config.importStrategy === 'component') {
        const fileHash = toHash(file, 6);
        const parsed = parsePath(file);
        const dasherized = dashCase(parsed.name);
        const cssFileName = `f_${dasherized}-${fileHash}.css`;
        current = `import '../../saltygen/css/${cssFileName}';\n${current}`;
      }
      current = current.replace(`{ styled }`, `{ styledClient as styled }`);
      current = current.replace(`@salty-css/react/styled`, `@salty-css/react/styled-client`);

      return current;
    }
  } catch (e) {
    console.error('Error in minimizeFile:', e);
  }
  return undefined;
};
