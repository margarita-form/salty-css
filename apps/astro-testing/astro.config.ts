import { defineConfig } from 'astro/config';
import { PluginOption } from 'vite';
import { generateCss, generateFile, isSaltyFile, compileSaltyFile, getDestDir } from '../../libs/core/src/compiler';
import { checkShouldRestart } from '../../libs/core/src/server';
import { resolveExportValue } from '../../libs/core/src/compiler/helpers';

const dir = new URL('.', import.meta.url).pathname + '/src';

export const saltyPlugin = (): PluginOption => {
  return {
    name: 'stylegen',
    buildStart: () => generateCss(dir),
    load: async (filePath) => {
      const saltyFile = isSaltyFile(filePath);
      if (saltyFile) {
        if (/.+\?component=(\w+).+/.test(filePath)) {
          const searchParams = new URLSearchParams(filePath.split('?')[1]);
          const componentName = searchParams.get('component');
          const tagName = searchParams.get('tagName');
          const classNames = searchParams.get('classNames');
          return `<${tagName} class="${classNames}" data-component-name="${componentName}"><slot/></${tagName}>`;
        }

        const destDir = await getDestDir(dir);
        const compiled = await compileSaltyFile(dir, filePath, destDir);

        const imports: string[] = [];
        const exports: string[] = [];

        for (const [name, value] of Object.entries(compiled.contents)) {
          const resolved = await resolveExportValue<any>(value, 1);
          if (!resolved.generator) continue;

          const generator = resolved.generator._withBuildContext({
            callerName: name,
            isProduction: false,
            config: {},
          });

          imports.push(`import ${name} from '${filePath}.astro?component=${name}&tagName=${generator.tagName}&classNames=${generator.classNames}';`);
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
