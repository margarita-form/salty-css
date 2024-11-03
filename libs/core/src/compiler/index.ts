import * as esbuild from 'esbuild';
import * as winston from 'winston';
import { execSync } from 'child_process';
import { toHash } from '../util/to-hash';
import { join } from 'path';
import {
  statSync,
  existsSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
  readFileSync,
} from 'fs';
import { StyleComponentGenerator } from '../generator/style-generator';
import { dashCase } from '../util/dash-case';
import { writeFile } from 'fs/promises';
import { parseStyles } from '../generator/parse-styles';
import { parseTemplates } from '../generator/parse-templates';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.cli()
  ),
  transports: [new winston.transports.Console({})],
});

const getDestDir = (dirname: string) => join(dirname, './saltygen');

// const fileExtensions = 'salty|css|styles'
const fileExtensions = ['salty', 'css', 'styles', 'styled'];
export const isSaltyFile = (file: string) =>
  new RegExp(`\\.(${fileExtensions.join('|')})\\.`).test(file);

const generateConfig = async (dirname: string) => {
  const destDir = getDestDir(dirname);
  const coreConfigPath = join(dirname, 'salty-config.ts');
  const coreConfigDest = join(destDir, 'salty-config.js');

  await esbuild.build({
    entryPoints: [coreConfigPath],
    minify: true,
    treeShaking: true,
    bundle: true,
    outfile: coreConfigDest,
    format: 'esm',
    external: ['react'],
  });

  const now = Date.now();
  const { config } = await import(`${coreConfigDest}?t=${now}`);
  return config;
};

export const generateVariables = async (dirname: string) => {
  // Generate the config files
  const config = await generateConfig(dirname);

  // Generate variables css file

  type Variables = { css?: string; ts?: string };
  const parseVariables = <T extends object>(
    obj: T,
    path: PropertyKey[] = []
  ): Variables[] => {
    if (!obj) throw 'Invalid variable layer';
    return Object.entries(obj).flatMap(
      ([key, value]): Variables | Variables[] => {
        if (!value) return {};
        if (typeof value === 'object')
          return parseVariables(value, [...path, key]);

        const cssName = [...path.map(dashCase), dashCase(key)].join('-');
        const tsName = [...path, key].join('.');
        return { css: `--${cssName}: ${value};`, ts: `"${tsName}"` };
      }
    );
  };

  const variables = parseVariables(config.variables);

  const destDir = getDestDir(dirname);

  const variablesPath = join(destDir, 'css/variables.css');
  const cssVariables = variables.map(({ css }) => css);
  const variablesCss = `:root { ${cssVariables.join(' ')} }`;
  writeFileSync(variablesPath, variablesCss);

  const tsTokensPath = join(destDir, 'types/css-tokens.d.ts');
  const tsTokens = variables.map(({ ts }) => ts).join('|');
  const tsTokensTypes = `type VariableTokens = ${tsTokens}; type PropertyValueToken = \`{\${VariableTokens}}\``;
  writeFileSync(tsTokensPath, tsTokensTypes);

  // Generate global styles
  const globalStylesPath = join(destDir, 'css/global.css');
  const globalStylesString = parseStyles(config.global, '');

  writeFileSync(globalStylesPath, globalStylesString);

  // Generate templates
  const templateStylesPath = join(destDir, 'css/templates.css');
  const templateStylesString = parseTemplates(config.templates);

  writeFileSync(templateStylesPath, templateStylesString);
};

export const compileSaltyFile = async (
  sourceFilePath: string,
  outputDirectory: string
) => {
  const hashedName = toHash(sourceFilePath);
  const outputFilePath = join(outputDirectory, 'js', hashedName + '.js');

  await esbuild.build({
    entryPoints: [sourceFilePath],
    minify: true,
    treeShaking: true,
    bundle: true,
    outfile: outputFilePath,
    format: 'esm',
    target: ['es2022'],
    keepNames: true,
    external: ['react'],
  });

  const now = Date.now();
  const contents = await import(`${outputFilePath}?t=${now}`);
  return contents as { [key: string]: { generator: StyleComponentGenerator } };
};

const getConfig = async (dirname: string) => {
  const destDir = getDestDir(dirname);
  const coreConfigDest = join(destDir, 'salty-config.js');
  const { config } = await import(coreConfigDest);
  return config;
};

export const generateCss = async (dirname: string) => {
  try {
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
    await generateVariables(dirname);

    // Function to copy files/directories recursively
    async function copyRecursively(src: string, dest: string) {
      const stats = statSync(src);

      if (stats.isDirectory()) {
        const files = readdirSync(src);
        await Promise.all(
          files.map((file) =>
            copyRecursively(join(src, file), join(dest, file))
          )
        );
      } else if (stats.isFile()) {
        const validFile = isSaltyFile(src);

        if (validFile) {
          const config = await getConfig(dirname);
          const contents = await compileSaltyFile(src, destDir);
          Object.entries(contents).forEach(([name, value]) => {
            if (!value.generator) return;

            const generator = value.generator._withBuildContext({
              name,
              config,
            });

            const fileName = `${generator.hash}-${generator.priority}.css`;
            if (!cssFiles[generator.priority])
              cssFiles[generator.priority] = [];
            cssFiles[generator.priority].push(fileName);

            const filePath = `css/${fileName}`;
            const cssPath = join(destDir, filePath);
            writeFileSync(cssPath, generator.css);
          });
        }
      }
    }
    // Start the copying process
    await copyRecursively(dirname, destDir);

    const cssFileImports = cssFiles
      .flat()
      .map((file) => `@import url('../saltygen/css/${file}');`)
      .join('\n');

    const globalImports = [
      "@import url('../saltygen/css/variables.css');",
      "@import url('../saltygen/css/global.css');",
      "@import url('../saltygen/css/templates.css');",
    ];
    const cssContent = `${globalImports.join('\n')}\n${cssFileImports}`;

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
      const contents = await compileSaltyFile(file, destDir);
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

      const cssFileImports = cssFiles.map(
        (file) => `@import url('../saltygen/css/${file}');`
      );

      const set = new Set([...cssFileImports, ...current]);
      const merged = [...set].join('\n');

      writeFileSync(cssFile, merged);
    }
  } catch (e) {
    console.error(e);
  }
};

export const minimizeFile = async (dirname: string, file: string) => {
  try {
    const destDir = join(dirname, './saltygen');
    const validFile = isSaltyFile(file);

    if (validFile) {
      let original = readFileSync(file, 'utf8');

      const copy = original.replace(
        /^(?!export\s)const\s.*/gm,
        (original) => `export ${original}`
      );

      if (copy !== original) await writeFile(file, original);

      const config = await getConfig(dirname);
      const contents = await compileSaltyFile(file, destDir);

      let current = original;
      Object.entries(contents).forEach(([name, value]) => {
        if (!value.generator) return;

        const generator = value.generator._withBuildContext({
          name,
          config,
        });

        const regexpResult = new RegExp(
          `${name}[=\\s]+[^()]+styled\\(([^,]+),`,
          'g'
        ).exec(original);

        if (!regexpResult) {
          return console.error('Could not find the original declaration');
        }

        const tagName = regexpResult.at(1)?.trim();
        const { element, variantKeys } = generator.props;

        const clientVersion = `${name} = styled(${tagName}, "${
          generator.classNames
        }", "${generator._callerName}", ${JSON.stringify(
          element
        )}, ${JSON.stringify(variantKeys)});`;

        const regexp = new RegExp(
          `${name}[=\\s]+[^()]+styled\\(([^,]+),[^;]+;`,
          'g'
        );

        current = current.replace(regexp, clientVersion);
      });

      current = current.replace(`{ styled }`, `{ styledClient as styled }`);
      current = current.replace(
        `@salty-css/react/styled`,
        `@salty-css/react/styled-client`
      );

      return current;
    }
  } catch (e) {
    console.error(e);
  }
  return undefined;
};
