import { generateCss, generateFile, isSaltyFile, minimizeFile } from '@salty-css/core/compiler';
import { checkShouldRestart } from '@salty-css/core/server';
import { PluginOption } from 'vite';

export const saltyPlugin = (dir: string): PluginOption => ({
  name: 'stylegen',
  buildStart: () => generateCss(dir),
  load: async (filePath: string) => {
    const saltyFile = isSaltyFile(filePath);
    if (saltyFile) {
      return await minimizeFile(dir, filePath);
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
});

export default saltyPlugin;
