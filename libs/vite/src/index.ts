import { generateCss, generateFile, isSaltyFile, minimizeFile } from '@salty-css/core/compiler';
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
    if (file.includes('salty.config')) {
      await server.restart();
    }
  },
  watchChange: {
    handler: async (filePath: string) => {
      const saltyFile = isSaltyFile(filePath);
      if (saltyFile) {
        await generateFile(dir, filePath);
      }
    },
  },
});

export default saltyPlugin;
