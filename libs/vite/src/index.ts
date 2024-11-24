import { generateCss, generateFile, generateConfigStyles, isSaltyFile, minimizeFile } from '@salty-css/core/compiler';

export const saltyPlugin = (dir: string) => ({
  name: 'stylegen',
  buildStart: () => generateCss(dir),
  load: async (filePath: string) => {
    const saltyFile = isSaltyFile(filePath);
    if (saltyFile) {
      return await minimizeFile(dir, filePath);
    }
    return undefined;
  },
  watchChange: {
    handler: async (filePath: string) => {
      const saltyFile = isSaltyFile(filePath);
      if (saltyFile) {
        await generateFile(dir, filePath);
      }
      if (filePath.includes('salty.config')) {
        await generateConfigStyles(dir);
      }
    },
  },
});

export default saltyPlugin;
