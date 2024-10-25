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
} from 'fs';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.cli()
  ),
  transports: [new winston.transports.Console({})],
});

const project = process.argv[2];
const onchange = process.argv[3];

const dirBase = join(__dirname, '../../');
const sourceDir = join(dirBase, project);
const destDir = join(sourceDir, './saltygen');

const cssFile = join(sourceDir, 'styles/index.css');

const generateConfig = async () => {
  const coreConfigPath = join(sourceDir, 'salty-config.ts');
  const coreConfigDest = join(destDir, 'salty-config.js');

  await esbuild.build({
    entryPoints: [coreConfigPath],
    minify: true,
    treeShaking: true,
    bundle: true,
    outfile: coreConfigDest,
    format: 'cjs',
    external: ['react'],
  });

  const { config } = await import(coreConfigDest);
  return config;
};

const clearDistDir = () => {
  if (onchange) return;
  if (existsSync(destDir)) execSync('rm -rf ' + destDir);
  mkdirSync(destDir);
  mkdirSync(join(destDir, 'css'));
};

const main = async () => {
  const cssFiles: string[] = [];
  // Clear the dist directory
  clearDistDir();

  // Generate the config files
  const config = await generateConfig();
  console.log({ config });

  // Function to copy files/directories recursively
  async function copyRecursively(src: string, dest: string) {
    const stats = statSync(src);

    if (stats.isDirectory()) {
      const files = readdirSync(src);
      await Promise.all(
        files.map((file) => copyRecursively(join(src, file), join(dest, file)))
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
          format: 'cjs',
          target: ['es2022'],
          keepNames: true,
          external: ['react'],
        });

        const contents = await import(dest);

        Object.entries(contents).forEach(([key, value]: [string, any]) => {
          // const generator = value.generator._withCallerName(key);
          const generator = value.generator;

          const fileName = `${generator.hash}.css`;
          cssFiles.push(fileName);
          console.log('pushing css file', fileName);

          const filePath = `css/${fileName}`;
          const cssPath = join(destDir, filePath);
          writeFileSync(cssPath, generator.css);
        });

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
  // Start the copying process
  await copyRecursively(sourceDir, destDir);

  const cssFileImports = cssFiles
    .map((file) => `@import url('../saltygen/css/${file}');`)
    .join('\n');

  writeFileSync(cssFile, cssFileImports);
};

main();
