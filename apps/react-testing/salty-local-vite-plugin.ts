/* eslint-disable @nx/enforce-module-boundaries */
import { PluginOption } from 'vite';
import { readFileSync } from 'fs';
import { parse as parsePath } from 'path';
import { isSaltyFile, resolveExportValue } from '../../libs/core/src/compiler/helpers';
import { getFunctionRange } from '../../libs/core/src/compiler/get-function-range';
import { SaltyCompiler } from '../../libs/core/src/compiler/salty-compiler';
import { checkShouldRestart } from '../../libs/core/src/server';
import { dashCase, toHash } from '../../libs/core/src/util';

/**
 * Workspace-local copy of `@salty-css/react`'s `transformSaltyFile`. Lives here so
 * the test app's `vite.config.ts` can be bundled by esbuild without resolving
 * package imports — keeps the test app self-contained.
 */
const transformSaltyFile = async (compiler: SaltyCompiler, file: string): Promise<string | undefined> => {
  try {
    if (!isSaltyFile(file)) return undefined;

    const destDir = await compiler.getDestDir();
    const original = readFileSync(file, 'utf8');

    const config = await compiler.getConfig();
    const { contents } = await compiler.compileSaltyFile(file, destDir);

    let current = original;

    for (const [name, value] of Object.entries(contents)) {
      const resolved = await resolveExportValue<any>(value, 1);
      if (resolved.isKeyframes) continue;
      if (!resolved.generator) continue;

      const generator = resolved.generator._withBuildContext({
        callerName: name,
        isProduction: compiler.isProduction,
        config,
      });

      const [start, end] = await getFunctionRange(current, name);
      const range = current.slice(start, end);

      if (resolved.isClassName) {
        const copy = current;
        const clientVersion = ` ${name} = className("${generator.classNames}")`;
        current = current.replace(range, clientVersion);
        if (copy === current) console.error('Minimize file failed to change content', { name });
      }

      if (range.includes('styled')) {
        const tagName = /styled\(([^,]+),/.exec(range)?.at(1)?.trim();
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
  } catch (e) {
    console.error('Error in transformSaltyFile:', e);
    return undefined;
  }
};

export const saltyLocalVitePlugin = (dir: string): PluginOption => {
  const saltyCompiler = new SaltyCompiler(dir);

  return {
    name: 'stylegen',
    buildStart: async () => await saltyCompiler.generateCss(),
    load: async (filePath: string) => {
      const saltyFile = isSaltyFile(filePath);
      if (saltyFile) {
        return await transformSaltyFile(saltyCompiler, filePath);
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
