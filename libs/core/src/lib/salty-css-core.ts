import * as esbuild from 'esbuild';
import { execSync } from 'child_process';
import { toHash } from '../util/to-hash';
import * as winston from 'winston';
import { join } from 'path';
import {
  statSync,
  existsSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
  readFileSync,
} from 'fs';
import { StyleComponentGenerator } from './generator';
import { dashCase } from '../util/dash-case';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.cli()
  ),
  transports: [new winston.transports.Console({})],
});

export const generateCss = async (dirname: string) => {
  try {
    const cssFiles: string[] = [];
    const destDir = join(dirname, './saltygen');
    const cssFile = join(destDir, 'index.css');

    const generateConfig = async () => {
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

      const { config } = await import(coreConfigDest);
      return config;
    };

    const clearDistDir = () => {
      if (existsSync(destDir)) execSync('rm -rf ' + destDir);
      mkdirSync(destDir);
      mkdirSync(join(destDir, 'css'));
    };

    // Clear the dist directory
    clearDistDir();

    // Generate the config files
    const config = await generateConfig();

    // Generate variables css file

    const variables = Object.entries(config.variables).map(([key, value]) => {
      return `--${dashCase(key)}: ${value};`;
    });

    const variablesCss = `:root {
      ${variables.join('\n')}
    }`;

    const variablesPath = join(destDir, 'css/variables.css');
    writeFileSync(variablesPath, variablesCss);

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
        const isSaltyFile = src.includes('.salty.');

        if (isSaltyFile) {
          const hashedName = toHash(src);
          const dest = join(destDir, 'js', hashedName + '.js');

          await esbuild.build({
            entryPoints: [src],
            minify: true,
            treeShaking: true,
            bundle: true,
            outfile: dest,
            format: 'esm',
            target: ['es2022'],
            keepNames: true,
            external: ['react'],
          });

          const now = Date.now();
          const contents = await import(`${dest}?t=${now}`);

          Object.entries(contents).forEach(([key, value]: [string, any]) => {
            const generator = value.generator._withCallerName(
              key
            ) as StyleComponentGenerator;

            const fileName = `${generator.hash}.css`;
            cssFiles.push(fileName);

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
      .map((file) => `@import url('../saltygen/css/${file}');`)
      .join('\n');

    const cssContent = `@import url('../saltygen/css/variables.css');\n${cssFileImports}`;

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
    const coreConfigDest = join(destDir, 'salty-config.js');
    const { config } = await import(coreConfigDest);

    const isSaltyFile = file.includes('.salty.');

    if (isSaltyFile) {
      const hashedName = toHash(file);
      const dest = join(destDir, 'js', hashedName + '.js');

      const res = await esbuild.build({
        entryPoints: [file],
        minify: false,
        treeShaking: true,
        bundle: true,
        outfile: dest,
        format: 'esm',
        target: ['es2022'],
        keepNames: true,
        external: ['react'],
      });

      const now = Date.now();
      const contents = await import(`${dest}?t=${now}`);

      Object.entries(contents).forEach(([key, value]: [string, any]) => {
        const generator = value.generator._withCallerName(
          key
        ) as StyleComponentGenerator;

        const fileName = `${generator.hash}.css`;
        const filePath = `css/${fileName}`;
        const cssPath = join(destDir, filePath);
        cssFiles.push(fileName);
        writeFileSync(cssPath, generator.css);
      });

      const current = readFileSync(cssFile, 'utf8').split('\n');

      const cssFileImports = cssFiles.map(
        (file) => `@import url('../saltygen/css/${file}');`
      );

      const set = new Set([...current, ...cssFileImports]);
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
    const isSaltyFile = file.includes('.salty.');

    if (isSaltyFile) {
      const original = readFileSync(file, 'utf8');
      const hashedName = toHash(file);
      const dest = join(destDir, 'js', hashedName + '.js');

      await esbuild.build({
        entryPoints: [file],
        minify: false,
        treeShaking: true,
        bundle: true,
        outfile: dest,
        format: 'esm',
        target: ['es2022'],
        keepNames: true,
        external: ['react'],
      });

      const now = Date.now();
      const contents = await import(`${dest}?t=${now}`);

      const mapped = Object.entries(contents).map(
        ([key, value]: [string, any]) => {
          const generator = value.generator._withCallerName(
            key
          ) as StyleComponentGenerator;

          const regexpResult = new RegExp(
            `${key}[=\\s]+[^()]+styled\\(([^,]+),`,
            'g'
          ).exec(original);

          if (!regexpResult) return '';
          const tagName = regexpResult.at(1)?.trim();

          return `export const ${key} = styled(${tagName}, "${
            generator.classNames
          }", "${generator._callerName}", "${generator.props.element || ''}");`;
        }
      );

      const imports = `import { styledClient as styled } from '@salty-css/react/styled-client';`;

      const full = `${imports}\n${mapped.join('')}`;
      return full;
    }
  } catch (e) {
    console.error(e);
  }
  return '';
};
