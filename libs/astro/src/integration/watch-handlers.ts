import { isSaltyFile } from '@salty-css/core/compiler/helpers';
import { SaltyCompiler } from '@salty-css/core/compiler/salty-compiler';
import { checkShouldRestart } from '@salty-css/core/server';
import { HmrContext, ModuleNode } from 'vite';

/** Vite `handleHotUpdate` hook body: invalidate config + generated-CSS modules. */
export const handleHotUpdate = async (saltyCompiler: SaltyCompiler, { file, server, modules }: HmrContext): Promise<ModuleNode[] | void> => {
  try {
    // Keyframes, define*() and the config change shared output, so regenerate everything and
    // invalidate every component config, not only the changed file's.
    const shouldRestart = await checkShouldRestart(file);
    if (shouldRestart) await saltyCompiler.generateCss(false);
    else if (!isSaltyFile(file)) return;

    const destDir = await saltyCompiler.getDestDir(); // absolute path
    const cssGraphHits = [];

    // Invalidate modules that imported the changed file's config
    for (const [id, mod] of server.moduleGraph.idToModuleMap) {
      const isConfigModule = shouldRestart ? id.includes('.astro?configFile=') : id.startsWith(file + '.astro?configFile=');
      if (isConfigModule) {
        server.moduleGraph.invalidateModule(mod);
        cssGraphHits.push(mod);
      }
    }

    // Invalidate modules that imported the changed file's generated CSS
    for (const mod of server.moduleGraph.urlToModuleMap.values()) {
      if (!mod.file) continue;
      if (mod.file.startsWith(destDir)) {
        server.moduleGraph.invalidateModule(mod);
        cssGraphHits.push(mod);
      }
    }

    server.ws.send({ type: 'update', updates: [] });

    return [...modules, ...cssGraphHits];
  } catch (error) {
    console.error('Error during hot update handling:', error);
  }
};

/** Vite `watchChange` hook body: regenerate the changed salty file on edits. */
export const watchChange = async (saltyCompiler: SaltyCompiler, filePath: string, change: { event: 'create' | 'update' | 'delete' }): Promise<void> => {
  try {
    const saltyFile = isSaltyFile(filePath);
    if (saltyFile && change.event !== 'delete') {
      const shouldRestart = await checkShouldRestart(filePath);
      // handleHotUpdate does the full regeneration on edits, but it doesn't run for new files.
      if (!shouldRestart) await saltyCompiler.generateFile(filePath);
      else if (change.event === 'create') await saltyCompiler.generateCss(false);
    }
  } catch (error) {
    console.error('Error during watch change handling:', error);
  }
};
