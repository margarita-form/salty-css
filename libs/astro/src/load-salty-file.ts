import { isSaltyFile } from '@salty-css/core/compiler/helpers';
import { getFunctionRange } from '@salty-css/core/compiler/get-function-range';
import { resolveExportValue } from '@salty-css/core/compiler/helpers';
import { SaltyCompiler } from '@salty-css/core/compiler/salty-compiler';
import { toHash } from '@salty-css/core/util';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { detectFramework, getFrameworkTransform } from './framework-registry';
import { renderAstroComponent } from './astro-template';

export interface AstroPluginContext {
  compiler: SaltyCompiler;
}

/**
 * Vite `load` hook body: resolves stored `.astro` component configs, delegates to
 * framework-specific transforms, or compiles a salty file into a styled/className
 * module while writing per-component `.config` files.
 */
export const loadSaltyFile = async (ctx: AstroPluginContext, filePath: string): Promise<string | undefined> => {
  const { compiler: saltyCompiler } = ctx;
  try {
    const saltyFile = isSaltyFile(filePath, [], !filePath.includes('configFile='));
    if (saltyFile) {
      const destDir = await saltyCompiler.getDestDir();
      if (/.+\?configFile=(\w+).+/.test(filePath)) {
        const searchParams = new URLSearchParams(filePath.split('?')[1]);
        const configFile = searchParams.get('configFile');
        if (!configFile) return undefined;
        return await renderAstroComponent(destDir, configFile);
      }

      const originalContents = await readFile(filePath, 'utf-8');

      const framework = detectFramework(originalContents);
      if (framework) {
        const transform = await getFrameworkTransform(framework);
        return await transform(saltyCompiler, filePath);
      }

      const imports: string[] = ["import { classNameInstance } from '@salty-css/core/instances/classname-instance';"];
      const consts: string[] = [];
      const exports: string[] = [];

      const compiled = await saltyCompiler.compileSaltyFile(filePath, destDir);

      const components = Object.entries(compiled.contents);
      for (const [name, value] of components) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const resolved = await resolveExportValue<any>(value, 1);
        if (!resolved.generator) continue;

        if (resolved.isClassName) {
          const generator = resolved.generator._withBuildContext({
            callerName: name,
            isProduction: saltyCompiler.isProduction,
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
          isProduction: saltyCompiler.isProduction,
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
};
