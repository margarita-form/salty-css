import * as esbuild from 'esbuild';
import { execSync } from 'child_process';
import { toHash } from '../util/to-hash';
import { join, parse as parsePath } from 'path';
import { statSync, existsSync, mkdirSync, readdirSync, writeFileSync, readFileSync } from 'fs';
import { StyleComponentGenerator } from '../generator/style-generator';
import { dashCase } from '../util/dash-case';
import { writeFile } from 'fs/promises';
import { parseStyles } from '../generator/parse-styles';
import { getTemplateTypes, parseTemplates } from '../generator/parse-templates';
import { CssConditionalVariables, CssResponsiveVariables } from '../config';
import { parseValueTokens } from '../generator/parse-tokens';
import { detectCurrentModuleType } from '../util/module-type';
import { logger } from '../bin/logger';

const cache = {
  externalModules: [] as string[],
};

const getExternalModules = (dirname: string) => {
  if (cache.externalModules.length > 0) return cache.externalModules;
  const coreConfigPath = join(dirname, 'salty.config.ts');
  const content = readFileSync(coreConfigPath, 'utf8');
  const match = content.match(/externalModules:\s?\[(.*)\]/);
  if (!match) return [];
  const externalModules = match[1].split(',').map((d) => d.replace(/['"`]/g, '').trim());
  cache.externalModules = externalModules;
  return externalModules;
};

const getDestDir = (dirname: string) => join(dirname, './saltygen');

export const saltyFileExtensions = ['salty', 'css', 'styles', 'styled'];
export const saltyFileRegExp = (additional: string[] = []) => new RegExp(`\\.(${[...saltyFileExtensions, ...additional].join('|')})\\.`);
export const isSaltyFile = (file: string, additional: string[] = []) => saltyFileRegExp(additional).test(file);

const generateConfig = async (dirname: string) => {
  const destDir = getDestDir(dirname);
  const coreConfigPath = join(dirname, 'salty.config.ts');
  const coreConfigDest = join(destDir, 'salty.config.js');

  const moduleType = await detectCurrentModuleType(dirname);
  const externalModules = getExternalModules(dirname);
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

export const generateConfigStyles = async (dirname: string) => {
  // Generate the config files
  const config = await generateConfig(dirname);

  // Generate variables css file
  const variableTokens = new Set<string>();

  type Variables = string | undefined;
  const parseVariables = <T extends object>(obj: T, path: PropertyKey[] = []): Variables[] => {
    if (!obj) return [];
    return Object.entries(obj).flatMap(([key, value]): Variables | Variables[] => {
      if (!value) return undefined;
      if (typeof value === 'object') return parseVariables(value, [...path, key]);

      const tsName = [...path, key].join('.');
      variableTokens.add(`"${tsName}"`);

      const cssName = [...path.map(dashCase), dashCase(key)].join('-');
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

  const variables = parseVariables(config.variables);
  const responsiveVariables = parseResponsiveVariables(config.responsiveVariables);
  const conditionalVariables = parseConditionalVariables(config.conditionalVariables);

  const destDir = getDestDir(dirname);

  const variablesPath = join(destDir, 'css/variables.css');
  const variablesCss = `:root { ${variables.join('')} ${responsiveVariables.join('')} } ${conditionalVariables.join('')}`;
  writeFileSync(variablesPath, variablesCss);

  // Generate global styles
  const globalStylesPath = join(destDir, 'css/global.css');
  const globalStylesString = parseStyles(config.global, '');

  writeFileSync(globalStylesPath, globalStylesString);

  // Generate templates
  const templateStylesPath = join(destDir, 'css/templates.css');
  const templateStylesString = parseTemplates(config.templates);
  const templateTokens = getTemplateTypes(config.templates);

  writeFileSync(templateStylesPath, templateStylesString);

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
};

export const compileSaltyFile = async (dirname: string, sourceFilePath: string, outputDirectory: string) => {
  const hashedName = toHash(sourceFilePath);
  const tempDir = join(outputDirectory, './temp');

  if (!existsSync(tempDir)) mkdirSync(tempDir);

  const parsed = parsePath(sourceFilePath);
  let currentFile = readFileSync(sourceFilePath, 'utf8');

  currentFile = currentFile.replace(/styled\([^"'`{,]+,/g, "styled('div',");

  const outputFilePath = join(outputDirectory, 'js', hashedName + '.js');
  const externalModules = getExternalModules(dirname);
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
  });

  const now = Date.now();
  const contents = await import(`${outputFilePath}?t=${now}`);

  return contents as {
    [key: string]: {
      generator: StyleComponentGenerator;
      isKeyframes?: boolean;
      animationName?: string;
      css?: string;
    };
  };
};

const getConfig = async (dirname: string) => {
  const destDir = getDestDir(dirname);
  const coreConfigDest = join(destDir, 'salty.config.js');
  const { config } = await import(coreConfigDest);
  return config;
};

const isProduction = () => {
  try {
    return process.env['NODE_ENV'] === 'production';
  } catch {
    return false;
  }
};

export const generateCss = async (dirname: string, prod = isProduction()) => {
  try {
    if (prod) logger.info('Generating CSS in production mode! 🔥');
    else logger.info('Generating CSS in development mode! 🚀');

    const globalCssFiles: string[] = [];
    const cssFiles: string[][] = [];
    const destDir = getDestDir(dirname);
    const cssFile = join(destDir, 'index.css');

    const clearDistDir = () => {
      if (existsSync(destDir)) execSync('rm -rf ' + destDir);
      mkdirSync(destDir);
      mkdirSync(join(destDir, 'css'));
      mkdirSync(join(destDir, 'types'));
    };

    // Clear the dist directory
    clearDistDir();

    // Generate variables
    await generateConfigStyles(dirname);

    // Get config
    const config = await getConfig(dirname);

    // Function to copy files/directories recursively
    async function copyRecursively(src: string, dest: string) {
      const foldersToSkip = ['node_modules', 'saltygen'];
      const stats = statSync(src);

      if (stats.isDirectory()) {
        const files = readdirSync(src);
        const shouldSkip = foldersToSkip.some((folder) => src.includes(folder));
        if (shouldSkip) return;
        await Promise.all(files.map((file) => copyRecursively(join(src, file), join(dest, file))));
      } else if (stats.isFile()) {
        const validFile = isSaltyFile(src);

        if (validFile) {
          const contents = await compileSaltyFile(dirname, src, destDir);
          const localCssFiles: string[] = [];
          Object.entries(contents).forEach(([name, value]) => {
            if (value.isKeyframes && value.css) {
              const fileName = `${value.animationName}.css`;
              const filePath = `css/${fileName}`;
              const cssPath = join(destDir, filePath);
              globalCssFiles.push(fileName);

              writeFileSync(cssPath, value.css);

              return;
            }

            if (!value.generator) return;

            const generator = value.generator._withBuildContext({
              name,
              config,
              prod,
            });

            const fileName = `${generator.hash}-${generator.priority}.css`;
            if (!cssFiles[generator.priority]) cssFiles[generator.priority] = [];
            cssFiles[generator.priority].push(fileName);
            localCssFiles.push(fileName);

            const filePath = `css/${fileName}`;
            const cssPath = join(destDir, filePath);
            writeFileSync(cssPath, generator.css);
          });

          const cssContent = localCssFiles.map((file) => `@import url('./${file}');`).join('\n');

          const hashName = toHash(src, 6);
          const cssFile = join(destDir, `css/${hashName}.css`);
          writeFileSync(cssFile, cssContent);
        }
      }
    }
    // Start the copying process
    await copyRecursively(dirname, destDir);

    const otherGlobalCssFiles = globalCssFiles.map((file) => `@import url('./css/${file}');`).join('\n');

    const globalCssFilenames = ['variables.css', 'global.css', 'templates.css'];
    const importsWithData = globalCssFilenames.filter((file) => {
      try {
        const data = readFileSync(join(destDir, 'css', file), 'utf8');
        return data.length > 0;
      } catch {
        return false;
      }
    });
    const globalImports = importsWithData.map((file) => `@import url('./css/${file}');`);
    let cssContent = `@layer l0, l1, l2, l3, l4, l5, l6, l7, l8;\n\n${globalImports.join('\n')}\n${otherGlobalCssFiles}`;
    if (config.importStrategy !== 'component') {
      const cssFileImports = cssFiles
        .flat()
        .map((file) => `@import url('./css/${file}');`)
        .join('\n');

      cssContent += cssFileImports;
    }

    writeFileSync(cssFile, cssContent);
  } catch (e) {
    console.error(e);
  }
};

export const generateFile = async (dirname: string, file: string) => {
  try {
    const cssFiles: string[] = [];
    const destDir = join(dirname, './saltygen');
    const cssFile = join(destDir, 'index.css');

    const validFile = isSaltyFile(file);

    if (validFile) {
      const config = await getConfig(dirname);
      const contents = await compileSaltyFile(dirname, file, destDir);
      Object.entries(contents).forEach(([name, value]: [string, any]) => {
        if (!value.generator) return;

        const generator = value.generator._withBuildContext({
          name,
          config,
        });

        const fileName = `${generator.hash}-${generator.priority}.css`;
        const filePath = `css/${fileName}`;
        const cssPath = join(destDir, filePath);
        cssFiles.push(fileName);
        writeFileSync(cssPath, generator.css);
      });

      const current = readFileSync(cssFile, 'utf8').split('\n');

      const cssFileImports = cssFiles.map((file) => `@import url('../saltygen/css/${file}');`);

      const set = new Set([...current, ...cssFileImports]);
      const merged = [...set].join('\n');

      writeFileSync(cssFile, merged);
    }
  } catch (e) {
    console.error(e);
  }
};

export const minimizeFile = async (dirname: string, file: string, prod = isProduction()) => {
  try {
    const destDir = join(dirname, './saltygen');
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

      const fileHash = toHash(file, 6);
      if (config.importStrategy === 'component') {
        current = `import '../../saltygen/css/${fileHash}.css';\n${current}`;
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
