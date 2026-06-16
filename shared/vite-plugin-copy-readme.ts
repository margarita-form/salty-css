import type { Plugin } from 'vite';

export const copyReadmePlugin: Plugin = {
  name: 'copy-readme',
  apply: 'build',
  closeBundle: async function () {
    const path = await import('node:path');
    const fs = await import('node:fs/promises');

    const thisDir = import.meta.dirname;
    const libDir = process.cwd();

    const src = path.resolve(thisDir, '../README.md');
    const dest = path.resolve(libDir, 'README.md');

    try {
      await fs.copyFile(src, dest);
      console.log('README.md copied to dist/');
    } catch (error) {
      console.error('Error copying README.md:', error);
      throw error;
    }
  },
};
