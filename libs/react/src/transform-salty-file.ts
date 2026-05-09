import { readFileSync } from 'fs';
import { parse as parsePath } from 'path';
import { isSaltyFile, resolveExportValue } from '@salty-css/core/compiler/helpers';
import { getFunctionRange } from '@salty-css/core/compiler/get-function-range';
import type { SaltyCompiler } from '@salty-css/core/compiler/salty-compiler';
import { dashCase, toHash } from '@salty-css/core/util';

/**
 * React-specific minimize transform for salty files. Rewrites `styled()` and
 * `className()` calls to their pre-resolved client-side variants and swaps the
 * relevant `@salty-css/react/*` imports for their `*-client` counterparts so
 * the runtime ships only the minimal client logic.
 */
export const transformSaltyFile = async (compiler: SaltyCompiler, file: string): Promise<string | undefined> => {
  try {
    const validFile = isSaltyFile(file);
    if (!validFile) return undefined;

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
