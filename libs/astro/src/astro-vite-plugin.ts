import { isSaltyFile } from '@salty-css/core/compiler/helpers';
import { getFunctionRange } from '@salty-css/core/compiler/get-function-range';
import { resolveExportValue } from '@salty-css/core/compiler/helpers';
import { SaltyCompiler } from '@salty-css/core/compiler/as-class';
import { checkShouldRestart } from '@salty-css/core/server';
import { toHash } from '@salty-css/core/util';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { PluginOption } from 'vite';

export const saltyPlugin = (dir: string): PluginOption => {
  const saltyCompiler = new SaltyCompiler(dir);

  return {
    name: 'stylegen',
    configureServer(_server) {
      saltyCompiler.importFile = async (path: string) => {
        const now = Date.now();
        return _server.ssrLoadModule(`${path}?t=${now}`);
      };
    },
    buildStart: async () => {
      await saltyCompiler.generateCss();
    },
    load: async (filePath) => {
      const saltyFile = isSaltyFile(filePath);
      if (saltyFile) {
        const destDir = await saltyCompiler.getDestDir();
        if (/.+\?configFile=(\w+).+/.test(filePath)) {
          const searchParams = new URLSearchParams(filePath.split('?')[1]);
          const configFile = searchParams.get('configFile');
          if (!configFile) return undefined;
          const configPath = join(destDir, 'astro', configFile);
          const configFileContent = await readFile(configPath, 'utf-8');
          if (!configFileContent) return undefined;
          try {
            const config = JSON.parse(configFileContent);
            const { clientProps = {}, classNames = '', tagIsComponent, tagName = 'div' } = config;

            const imports: string[] = config.imports || [];
            const element = tagIsComponent ? tagName : `props.element || "${clientProps.element || tagName}"`;

            let propsAttr = '';
            if (clientProps.element && tagIsComponent) propsAttr += ` element="${clientProps.element}"`;
            if (clientProps.attr) for (const [key, value] of Object.entries<string>(clientProps.attr)) propsAttr += ` ${key}="${value}"`;
            propsAttr = propsAttr.trim();

            const result = `---
            ${imports.join('\n')}
            const { props } = Astro;
            const Element = ${element};
            ---
            <Element class:list={["${classNames}", props.class]} ${propsAttr} {...props}><slot/></Element>`;
            return result;
          } catch (error) {
            console.error('Error parsing config file:', error);
            return undefined;
          }
        }

        const imports: string[] = ["import { classNameInstance } from '@salty-css/core/instances/classname-instance';"];
        const consts: string[] = [];
        const exports: string[] = [];

        const originalContents = await readFile(filePath, 'utf-8');
        const compiled = await saltyCompiler.compileSaltyFile(filePath, destDir);

        const components = Object.entries(compiled.contents);
        for (const [name, value] of components) {
          const resolved = await resolveExportValue<any>(value, 1);
          if (!resolved.generator) continue;

          if (resolved.isClassName) {
            const generator = resolved.generator._withBuildContext({
              callerName: name,
              isProduction: false,
              config: {},
            });

            consts.push(`const ${name} = classNameInstance(${JSON.stringify(generator.params)});`);
            exports.push(name);
            continue;
          }

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
            tagIsComponent: false,
            classNames: generator.classNames,
            imports: [] as (string | undefined)[],
            clientProps: generator.clientProps,
          };

          const extendsComponent = /^\w+$/.test(tagName);
          fileConfig.tagIsComponent = extendsComponent;
          if (extendsComponent) {
            const isInSameFile = components.some(([name]) => name === tagName);
            const matchingImport = originalContents.match(new RegExp(`import[^;]*${tagName}[^;]*;`));
            if (isInSameFile) {
              const hashedName = toHash(tagName);
              const importPath = `import ${tagName} from '${filePath}.astro?configFile=${hashedName}.config';`;
              fileConfig.imports = [importPath];
            } else if (matchingImport) {
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

        const result = `${imports.join('\n')}\n${consts.join('\n')}\nexport { ${exports.join(', ')} };`;
        return result;
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
          if (!shouldRestart) await saltyCompiler.generateFile(filePath);
        }
      },
    },
  };
};

export default saltyPlugin;
