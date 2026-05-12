import { BaseStyles } from '@salty-css/core/types';
import { getDynamicStylesClassName, getDynamicStylesCss } from '@salty-css/core/css/dynamic-styles';

export { getDynamicStylesClassName, getDynamicStylesCss };

/**
 * Resolve dynamic styles for SSR usage inside an `.astro` component.
 *
 * @example
 * ```astro
 * ---
 * import { resolveDynamicStyles } from '@salty-css/astro/dynamic-styles';
 * const { className, css } = await resolveDynamicStyles({ color: 'red' });
 * ---
 * <style set:html={css}></style>
 * <div class={className}><slot/></div>
 * ```
 */
export const resolveDynamicStyles = async (styles: BaseStyles, scope?: string) => {
  const className = getDynamicStylesClassName(styles);
  const css = await getDynamicStylesCss(styles, scope || `.${className}`);
  return { className, css };
};
