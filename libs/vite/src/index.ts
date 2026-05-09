import { isSaltyFile } from '@salty-css/core/compiler/helpers';
import { SaltyCompiler } from '@salty-css/core/compiler/salty-compiler';
import { checkShouldRestart } from '@salty-css/core/server';
import { PluginOption } from 'vite';

type SaltyFileTransform = (compiler: SaltyCompiler, file: string) => Promise<string | undefined>;

const loadFrameworkTransform = async (framework: string | undefined): Promise<SaltyFileTransform> => {
  if (framework === 'react' || framework === undefined) {
    const mod = await import('@salty-css/react/transform-salty-file');
    return mod.transformSaltyFile;
  }

  throw new Error(`@salty-css/vite: framework "${framework}" is not supported. Supported: react.`);
};

export const saltyPlugin = (dir: string): PluginOption => {
  const saltyCompiler = new SaltyCompiler(dir);

  let transformPromise: Promise<SaltyFileTransform> | undefined;
  const getTransform = () => {
    if (!transformPromise) transformPromise = saltyCompiler.getFramework().then(loadFrameworkTransform);
    return transformPromise;
  };

  return {
    name: 'stylegen',
    buildStart: async () => await saltyCompiler.generateCss(),
    load: async (filePath: string) => {
      const saltyFile = isSaltyFile(filePath);
      if (saltyFile) {
        const transform = await getTransform();
        return await transform(saltyCompiler, filePath);
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
