import type { PluginOption } from 'vite';
import {
  generateCss,
  generateFile,
  generateVariables,
  minimizeFile,
} from '../lib/salty-css-core';

export const saltyPlugin: () => PluginOption = () => ({
  name: 'stylegen',
  buildStart: () => generateCss(__dirname),
  load: async (filePath) => {
    if (filePath.includes('.salty.')) {
      return await minimizeFile(__dirname, filePath);
    }
    return undefined;
  },
  watchChange: {
    handler: async (filePath) => {
      if (filePath.includes('.salty.')) {
        await generateFile(__dirname, filePath);
      }
      if (filePath.includes('salty-config')) {
        await generateVariables(__dirname);
      }
    },
  },
});
