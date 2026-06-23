import type { Plugin } from 'vite';
import { includeVersionAsDefinePlugin, updateVersionsPlugin } from './vite-plugin-update-versions';
import { copyReadmePlugin } from './vite-plugin-copy-readme';

export const vitePlugins: Plugin[] = [updateVersionsPlugin, includeVersionAsDefinePlugin, copyReadmePlugin];
