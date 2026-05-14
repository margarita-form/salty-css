import { isSaltyFile } from '@salty-css/core/compiler/helpers';
import { getFunctionRange } from '@salty-css/core/compiler/get-function-range';
import { resolveExportValue } from '@salty-css/core/compiler/helpers';
import { SaltyCompiler } from '@salty-css/core/compiler/salty-compiler';
import { checkShouldRestart } from '@salty-css/core/server';
import { toHash } from '@salty-css/core/util';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { PluginOption } from 'vite';

export const saltyPlugin = (dir: string): PluginOption => {
  const saltyCompiler = new SaltyCompiler(dir);

  return {
    name: 'stylegen',
    configureServer: function (_server) {
      saltyCompiler.importFile = async (path: string) => {
        const now = Date.now();
        return _server.ssrLoadModule(`${path}?t=${now}`);
      };
    },
    configResolved: async function () {
      try {
        await saltyCompiler.generateCss();
      } catch (error) {
        console.error('Error during initial CSS generation:', error);
        throw error;
      }
    },
    load: async function (filePath) {
      try {
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

              const userImports: string[] = config.imports || [];
              const imports = ["import { resolveAstroProps } from '@salty-css/astro/element-props';", ...userImports];

              const elementExpr = tagIsComponent ? tagName : `__r.element || ${JSON.stringify(clientProps.element || tagName)}`;

              const result = `---
            ${imports.join('\n')}
            const __gp = ${JSON.stringify(clientProps)};
            const __r = resolveAstroProps(Astro.props, __gp, ${JSON.stringify(classNames)});
            const Element = ${elementExpr};
            ---
            <Element class:list={__r.class} style={__r.style} {...__r.rest}><slot/></Element>`;
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      } catch (error) {
        console.error('Error during file compilation:', error);
        return undefined;
      }
    },
    handleHotUpdate: async function ({ file, server, modules }) {
      try {
        const shouldRestart = await checkShouldRestart(file);
        if (shouldRestart) return await saltyCompiler.generateCss(false);
        const saltyFile = isSaltyFile(file);
        if (!saltyFile) return;

        const destDir = await saltyCompiler.getDestDir(); // absolute path
        const cssGraphHits = [];

        // Invalidate modules that imported the changed file's config
        for (const [id, mod] of server.moduleGraph.idToModuleMap) {
          if (id.startsWith(file + '.astro?configFile=')) {
            server.moduleGraph.invalidateModule(mod);
            cssGraphHits.push(mod);
          }
        }

        // Invalidate modules that imported the changed file's generated CSS
        for (const mod of server.moduleGraph.urlToModuleMap.values()) {
          if (!mod.file) continue;
          if (mod.file.startsWith(destDir)) {
            server.moduleGraph.invalidateModule(mod);
            cssGraphHits.push(mod);
          }
        }

        server.ws.send({ type: 'update', updates: [] });

        return [...modules, ...cssGraphHits];
      } catch (error) {
        console.error('Error during hot update handling:', error);
      }
    },
    watchChange: {
      handler: async function (filePath, change) {
        try {
          const saltyFile = isSaltyFile(filePath);
          if (saltyFile && change.event !== 'delete') {
            const shouldRestart = await checkShouldRestart(filePath);
            if (!shouldRestart) await saltyCompiler.generateFile(filePath);
          }
        } catch (error) {
          console.error('Error during watch change handling:', error);
        }
      },
    },
  };
};

export default saltyPlugin;
