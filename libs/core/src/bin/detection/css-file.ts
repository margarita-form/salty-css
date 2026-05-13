import { readFile } from 'fs/promises';
import { join, relative } from 'path';

const CSS_FILE_FOLDERS = ['src', 'public', 'assets', 'styles', 'css', 'app'];
const CSS_SECOND_LEVEL_FOLDERS = ['styles', 'css', 'app', 'pages'];
const CSS_FILE_NAMES = ['index', 'styles', 'main', 'app', 'global', 'globals'];
const CSS_FILE_EXTENSIONS = ['.css', '.scss', '.sass'];

/**
 * Looks for a global CSS file inside `projectDir` and returns its path relative to it,
 * or undefined when none is found.
 */
export const findGlobalCssFile = async (projectDir: string): Promise<string | undefined> => {
  for (const folder of CSS_FILE_FOLDERS) {
    for (const file of CSS_FILE_NAMES) {
      for (const ext of CSS_FILE_EXTENSIONS) {
        const filePath = join(projectDir, folder, file + ext);
        const fileContent = await readFile(filePath, 'utf-8').catch(() => undefined);
        if (fileContent !== undefined) return relative(projectDir, filePath);
        for (const second of CSS_SECOND_LEVEL_FOLDERS) {
          const nestedPath = join(projectDir, folder, second, file + ext);
          const nestedContent = await readFile(nestedPath, 'utf-8').catch(() => undefined);
          if (nestedContent !== undefined) return relative(projectDir, nestedPath);
        }
      }
    }
  }
  return undefined;
};
