import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Render the `.astro` component template for a styled/className component from its
 * stored `<hash>.config` file. Returns `undefined` when the config cannot be read
 * or parsed so the caller can fall through.
 */
export const renderAstroComponent = async (destDir: string, configFile: string): Promise<string | undefined> => {
  const configPath = join(destDir, 'astro', configFile);
  const configFileContent = await readFile(configPath, 'utf-8');
  if (!configFileContent) return undefined;
  try {
    const config = JSON.parse(configFileContent);
    const { clientProps = {}, classNames = '', tagIsComponent, tagName = 'div' } = config;

    const userImports: string[] = config.imports || [];
    const imports = ["import { resolveAstroProps } from '@salty-css/astro/element-props';", ...userImports];

    const elementExpr = tagIsComponent ? tagName : `__r.element || ${JSON.stringify(clientProps.element || tagName)}`;

    return `---
            ${imports.join('\n')}
            const __gp = ${JSON.stringify(clientProps)};
            const __r = resolveAstroProps(Astro.props, __gp, ${JSON.stringify(classNames)});
            const Element = ${elementExpr};
            ---
            <Element class:list={__r.class} style={__r.style} {...__r.rest}><slot/></Element>`;
  } catch (error) {
    console.error('Error parsing config file:', error);
    return undefined;
  }
};
