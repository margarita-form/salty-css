import { CachedConfig, SaltyConfig } from '../types/config-types';
import { CompoundVariant } from '../types';
import { parseValueModifiers } from './parse-modifiers';
import { parseValueTokens } from './parse-tokens';
import { addUnit } from './unit-check';
import { propertyNameCheck } from './property-name-check';
import { StyleValueModifierFunction } from './parser-types';

/**
 * Transform styles object to css string with or without scope
 * @param styles CSS as JS object
 * @param currentScope Scope of the styles, for class names full path with dot separator is required
 * @param config Salty config object to allow use of templates and media queries etc.
 * @returns CSS strings that can be injected to the .css file or used inside of styles tag
 * - First item is the main class with all the styles
 * - Rest of the items are child selectors or media queries etc.
 */
export const parseStyles = async <T extends object>(styles?: T, currentScope = '', config?: (SaltyConfig & CachedConfig) | undefined): Promise<Set<string>> => {
  if (!styles) throw new Error('No styles provided to parseStyles function!');
  const cssStyles = new Set<string>();
  const entries = Object.entries(styles);

  const promises = entries.map(async ([key, value]) => {
    const _key = key.trim();
    const propertyName = propertyNameCheck(_key);

    const toString = (val: unknown, eol = ';') => `${propertyName}:${val}${eol}`;
    const context = { scope: currentScope, config }; // todo, add typing and add custom context options

    if (typeof value === 'function') value = value(context);
    if (value instanceof Promise) value = await value;

    if (config?.templates && config.templatePaths[_key]) {
      const { default: values } = await import(config.templatePaths[_key]);
      if (typeof values.params[_key] === 'function') {
        const templateStyles = await values.params[_key](value);
        const [result] = await parseStyles(templateStyles, '');
        return result;
      }
    }

    if (config?.templates && config.templates[_key]) {
      const path = value.split('.');
      const templateStyles = path.reduce((acc: Record<string, any>, key: string) => acc[key], config.templates[_key]);
      if (templateStyles) {
        const [result] = await parseStyles(templateStyles, '');
        return result;
      }
      console.warn(`Template "${_key}" with path of "${value}" was not found in config!`);
      return undefined;
    }

    if (typeof value === 'object') {
      if (!value) return undefined;
      if (value.isColor) return toString(value.toString());

      if (_key === 'defaultVariants') return undefined;

      if (_key === 'variants') {
        const variantEntries = Object.entries(value);
        for (const [prop, conditions] of variantEntries) {
          if (!conditions) return;
          const entries = Object.entries(conditions);
          for (const [val, styles] of entries) {
            if (!styles) return;
            const scope = `${currentScope}.${prop}-${val}`;
            const results = await parseStyles(styles, scope, config);
            results.forEach((res) => cssStyles.add(res));
          }
        }
        return undefined;
      }

      if (_key === 'compoundVariants') {
        for (const variant of value as CompoundVariant[]) {
          const { css, ...rest } = variant;
          const scope = Object.entries(rest).reduce((acc, [prop, val]) => {
            return `${acc}.${prop}-${val}`;
          }, currentScope);
          const results = await parseStyles(css as T, scope, config);
          results.forEach((res) => cssStyles.add(res));
        }
        return undefined;
      }

      if (_key.startsWith('@')) {
        const mediaQuery = config?.mediaQueries?.[_key] || _key;
        const results = await parseAndJoinStyles(value, currentScope, config);
        const query = `${mediaQuery} { ${results} }`;
        cssStyles.add(query);
        return undefined;
      }

      const scope = key.includes('&') ? _key.replace('&', currentScope) : _key.startsWith(':') ? `${currentScope}${_key}` : `${currentScope} ${_key}`;
      const results = await parseStyles(value, scope, config);
      results.forEach((result) => cssStyles.add(result));
      return undefined;
    }

    if (typeof value === 'number') {
      const withUnit = addUnit(propertyName, value, config);
      return toString(withUnit);
    }
    if (typeof value !== 'string') {
      if ('toString' in value) value = value.toString();
      else throw new Error(`Invalid value type for property ${propertyName}`);
    }

    return toString(value);
  });

  const { modifiers } = config || {};

  const afterFunctions: StyleValueModifierFunction[] = [parseValueTokens(), parseValueModifiers(modifiers)];

  const resolved = await Promise.all(promises).then((styles) => {
    return Promise.all(
      styles.map((str) => {
        return afterFunctions.reduce(async (acc, fn) => {
          const current = await acc;
          if (!current) return current;

          const result = await fn(current);
          if (!result) return current;

          const { transformed, additionalCss } = result;
          let before = '';
          if (additionalCss) {
            for (const css of additionalCss) {
              before += await parseAndJoinStyles(css, '');
            }
          }
          return `${before}${transformed}`;
        }, Promise.resolve(str));
      })
    );
  });

  const mapped = resolved.join('\n');
  if (!mapped.trim()) return cssStyles;

  const css = currentScope ? `${currentScope} { ${mapped} }` : mapped;
  cssStyles.add(css);
  return cssStyles;
};

export const parseAndJoinStyles = async <T extends object>(
  styles: T,
  currentClass: string,
  config?: (SaltyConfig & CachedConfig) | undefined
): Promise<string> => {
  const css = await parseStyles(styles, currentClass, config);
  return [...css].join('\n');
};
