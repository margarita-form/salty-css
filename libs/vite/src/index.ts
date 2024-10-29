import {
  generateCss,
  generateFile,
  generateVariables,
  minimizeFile,
} from '@salty-css/core/compiler';

export const saltyPlugin = (dir: string) => ({
  name: 'stylegen',
  buildStart: () => generateCss(dir),
  load: async (filePath: string) => {
    if (filePath.includes('.salty.')) {
      return await minimizeFile(dir, filePath);
    }
    return undefined;
  },
  watchChange: {
    handler: async (filePath: string) => {
      if (filePath.includes('.salty.')) {
        await generateFile(dir, filePath);
      }
      if (filePath.includes('salty-config')) {
        await generateVariables(dir);
      }
    },
  },
});
