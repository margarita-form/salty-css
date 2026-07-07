import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Render the `.astro` component template for a styled/className component from its
 * stored `<hash>.config` file. Returns `undefined` when the config cannot be read
 * or parsed so the caller can fall through.
 */
export const renderAstroComponent = async (destDir: string, configFile: string): Promise<string | undefined> => {
  const configPath = join(destDir, 'astro', configFile);
  try {
    const configFileContent = await readFile(configPath, 'utf-8');
    if (!configFileContent) return undefined;
    const config = JSON.parse(configFileContent);
    const { clientProps = {}, classNames = '', tagIsComponent, extendsStyled = false, tagName = 'div' } = config;

    const userImports: string[] = config.imports || [];
    const imports = ["import { resolveAstroProps } from '@salty-css/astro/integration/element-props';", ...userImports];

    const elementExpr = tagIsComponent ? tagName : `__r.element || ${JSON.stringify(clientProps.element || tagName)}`;

    // React parity (element-factory.ts): forward the resolved `element` to any
    // extended component so it can resolve its own tag, and forward the `_vks`
    // set only when extending another styled component.
    const forwardedAttrs = `${tagIsComponent ? ' element={__r.element}' : ''}${extendsStyled ? ' _vks={__r._vks}' : ''}`;

    return `---
            ${imports.join('\n')}
            const __cp = ${JSON.stringify(clientProps)};
            const __r = resolveAstroProps(Astro.props, __cp, ${JSON.stringify(classNames)}, undefined, ${JSON.stringify(!!extendsStyled)});
            const Element = ${elementExpr};
            ---
            <Element class:list={__r.class} style={__r.style} {...__r.rest}${forwardedAttrs}><slot/></Element>`;
  } catch (error) {
    console.error('Error parsing config file:', error);
    return undefined;
  }
};
