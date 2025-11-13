import { isSaltyFile } from '@salty-css/core/compiler';
import { SaltyCompiler } from '@salty-css/core/compiler/as-class';
import { checkShouldRestart } from '@salty-css/core/server';
import { PluginOption } from 'vite';

export const saltyPlugin = (dir: string): PluginOption => {
  const saltyCompiler = new SaltyCompiler(dir);

  return {
    name: 'stylegen',
    buildStart: async () => await saltyCompiler.generateCss(),
    load: async (filePath: string) => {
      const saltyFile = isSaltyFile(filePath);
      if (saltyFile) {
        return await saltyCompiler.minimizeFile(filePath);
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
