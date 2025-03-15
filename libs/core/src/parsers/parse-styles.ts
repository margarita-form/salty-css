import { CachedConfig, SaltyConfig } from '../types/config-types';
import { CompoundVariant } from '../types';
import { parseValueModifiers } from './parse-modifiers';
import { parseValueTokens } from './parse-tokens';
import { addUnit } from './unit-check';
import { propertyNameCheck } from './property-name-check';
import { compileSaltyFile } from '../compiler';
import { readFileSync } from 'fs';

//     const { modifiers } = config || {};
//     const runParsers = function* () {
//       yield parseValueTokens(value);
//       yield parseValueModifiers(value, modifiers);
//     };

//     const generator = runParsers();

//     for (const { result, additionalCss = [] } of generator) {
//       value = result;
//       additionalCss.forEach((css) => {
//         const result = parseStyles(css, '');
//         appendString(result, '');
//       });
//     }

//     return appendValue(value);
//   }, '');

//   if (!current) return classes.join('\n');
//   if (!currentClass) return current;

//   const css = `${currentClass} { ${current} }`;
//   return [css, ...classes].join('\n');
// };

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

    //   if (config?.templates && config.templatePaths[_key]) {
    //     console.log('Template path:', _key, config.templatePaths[_key]);
    //     const maybe = await import(config.templatePaths[_key]);
    //     console.log(maybe);
    //     return [propertyName, undefined];
    //   }

    if (config?.templates && config.templates[_key]) {
      const path = value.split('.');
      const templateStyles = path.reduce((acc: Record<string, any>, key: string) => acc[key], config.templates[_key]);
      if (templateStyles) {
        const [result] = await parseStyles(templateStyles, '');
        // return `${acc}${result}`;
        return result;
      }
      console.warn(`Template "${_key}" with path of "${value}" was not found in config!`);
      return [propertyName, undefined];
    }

    if (typeof value === 'object') {
      if (!value) return undefined;
      if (value.isColor) return toString(value.toString());

      if (_key === 'defaultVariants') return undefined;

      if (_key === 'variants') {
        //         Object.entries<any>(value).forEach(([prop, conditions]) => {
        //           if (!conditions) return;
        //           Object.entries<any>(conditions).forEach(([val, styles]) => {
        //             if (!styles) return;
        //             const scope = `${currentClass}.${prop}-${val}`;
        //             const result = await parseStyles(styles, scope, config);
        //             classes.push(result);
        //           });
        //         });
        //         return acc;
        Object.entries<any>(value).forEach(async ([prop, conditions]) => {
          if (!conditions) return;
          Object.entries<any>(conditions).forEach(async ([val, styles]) => {
            if (!styles) return;
            const scope = `${currentScope}.${prop}-${val}`;
            const results = await parseStyles(styles, scope, config);
            results.forEach((res) => cssStyles.add(res));
          });
        });
        return undefined;
      }

      if (_key === 'compoundVariants') {
        //         value.forEach((variant: CompoundVariant) => {
        //           const { css, ...rest } = variant;
        //           const scope = Object.entries(rest).reduce((acc, [prop, val]) => {
        //             return `${acc}.${prop}-${val}`;
        //           }, currentClass);
        //           const result = await parseStyles(css as T, scope, config);
        //           classes.push(result);
        //         });
        //         return acc;
        value.forEach(async (variant: CompoundVariant) => {
          const { css, ...rest } = variant;
          const scope = Object.entries(rest).reduce((acc, [prop, val]) => {
            return `${acc}.${prop}-${val}`;
          }, currentScope);
          const results = await parseStyles(css as T, scope, config);
          results.forEach((res) => cssStyles.add(res));
        });
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

  // const { modifiers } = config || {};

  // const afterFunctions: [(current: string) => Promise<string> | string] = [parseValueTokens, parseValueModifiers];

  const resolved = await Promise.all(promises);
  const mapped = resolved.flatMap((val) => val).join('\n');

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
