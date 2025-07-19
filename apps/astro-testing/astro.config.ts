import { defineConfig } from 'astro/config';
import { PluginOption } from 'vite';
import { generateCss, generateFile, isSaltyFile, compileSaltyFile, getDestDir } from '../../libs/core/src/compiler';
import { checkShouldRestart } from '../../libs/core/src/server';
import { resolveExportValue } from '../../libs/core/src/compiler/helpers';
import { toHash } from '../../libs/core/src/util';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { getFunctionRange } from '../../libs/core/src/compiler/get-function-range';

const dir = new URL('.', import.meta.url).pathname + '/src';

export const saltyPlugin = (): PluginOption => {
  return {
    name: 'stylegen',
    buildStart: () => generateCss(dir),
    load: async (filePath) => {
      const saltyFile = isSaltyFile(filePath);
      if (saltyFile) {
        const destDir = await getDestDir(dir);
        if (/.+\?configFile=(\w+).+/.test(filePath)) {
          const searchParams = new URLSearchParams(filePath.split('?')[1]);
          const configFile = searchParams.get('configFile');
          if (!configFile) return undefined;
          const configPath = join(destDir, 'astro', configFile);
          const configFileContent = await readFile(configPath, 'utf-8');
          if (!configFileContent) return undefined;
          try {
            const config = JSON.parse(configFileContent);
            const imports: string[] = config.imports || [];
            return `---
            ${imports.join('\n')}
            const { props } = Astro;
            ---
            <${config.tagName} class="${config.classNames}" data-component-name="${config.componentName}" {...props}><slot/></${config.tagName}>`;
            return '';
          } catch (error) {
            console.error('Error parsing config file:', error);
            return undefined;
          }
        }

        const imports: string[] = [];
        const exports: string[] = [];

        const originalContents = await readFile(filePath, 'utf-8');

        const compiled = await compileSaltyFile(dir, filePath, destDir);
        for (const [name, value] of Object.entries(compiled.contents)) {
          const resolved = await resolveExportValue<any>(value, 1);
          if (!resolved.generator) continue;

          const [start, end] = await getFunctionRange(originalContents, name);
          const range = originalContents.slice(start, end);
          const tagName = /styled\(([^,]+),/.exec(range)?.at(1)?.trim();
          if (!tagName) {
            console.warn(`Could not determine tag name for ${name} in ${filePath}`);
            continue;
          }

          const generator = resolved.generator._withBuildContext({
            callerName: name,
            isProduction: false,
            config: {},
          });

          const fileConfig = {
            componentName: name,
            tagName: tagName.replace(/['"`]/g, ''),
            classNames: generator.classNames,
          } as Record<string, any>;

          const extendsComponent = /^\w+$/.test(tagName);
          if (extendsComponent) {
            const matchingImport = originalContents.match(new RegExp(`import[^;]*${tagName}[^;]*;`));
            if (matchingImport) {
              const importPath = matchingImport.at(0);
              fileConfig.imports = [importPath];
            }
          }

          const astroComponentsDir = join(destDir, 'astro');
          const exists = await readFile(astroComponentsDir, 'utf-8').catch(() => false);

          if (!exists) await mkdir(astroComponentsDir, { recursive: true });

          const hashedName = toHash(name);
          const fileConfigPath = join(destDir, `astro`, `${hashedName}.config`);
          await writeFile(fileConfigPath, JSON.stringify(fileConfig));

          imports.push(`import ${name} from '${filePath}.astro?configFile=${hashedName}.config';`);
          exports.push(name);
        }

        return `${imports.join('\n')}export { ${exports.join(', ')} };`;
      }
      return undefined;
    },
    handleHotUpdate: async ({ file, server }) => {
      const shouldRestart = await checkShouldRestart(file);
      if (shouldRestart) server.restart();
    },
    watchChange: {
      handler: async (filePath, change) => {
        const saltyFile = isSaltyFile(filePath);
        if (saltyFile && change.event !== 'delete') {
          const shouldRestart = await checkShouldRestart(filePath);
          if (!shouldRestart) await generateFile(dir, filePath);
        }
      },
    },
  };
};

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [saltyPlugin()],
  },
});
