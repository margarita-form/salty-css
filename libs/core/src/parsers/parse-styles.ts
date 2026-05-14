/* eslint-disable @typescript-eslint/no-explicit-any */
import { CachedConfig, SaltyConfig } from '../types/config-types';
import { MultiVariant } from '../types';
import { parseValueModifiers } from './parse-modifiers';
import { parseValueTokens } from './parse-tokens';
import { addUnit } from './unit-check';
import { propertyNameCheck } from './property-name-check';
import { StyleValueModifierFunction } from './parser-types';
import { reportParserIssue, StrictMode } from './strict';
import { bareAtRuleRegex, pseudoTypoRegex, templateLiteralLeftoverRegex } from './parser-regexes';

/**
 * Transform styles object to css string with or without scope
 * @param styles CSS as JS object
 * @param currentScope Scope of the styles, for class names full path with dot separator is required
 * @param config Salty config object to allow use of templates and media queries etc.
 * @param omitTemplates If true, static templates will be ignored
 * @returns CSS strings that can be injected to the .css file or used inside of styles tag
 * - First item is the main class with all the styles
 * - Rest of the items are child selectors or media queries etc.
 */
export const parseStyles = async <T extends object>(
  styles?: T,
  currentScope = '',
  config?: Partial<SaltyConfig & CachedConfig> | CachedConfig | undefined,
  omitTemplates = false
): Promise<string[]> => {
  if (!styles) throw new Error('No styles provided to parseStyles function!');
  const cssStyles = new Set<string>();
  const entries = Object.entries(styles);
  const strict: StrictMode = (config as { strict?: StrictMode } | undefined)?.strict;

  const processStyleEntry = async ([key, value]: [key: string, any]) => {
    const _key = key.trim().replace(/^\?+/g, '');
    const propertyName = propertyNameCheck(_key);

    const toString = (val: unknown, eol = ';') => `${propertyName}:${val}${eol}`;
    const context = { scope: currentScope, config }; // todo, add typing and add custom context options

    if (typeof value === 'function') {
      try {
        return await processStyleEntry([key, value(context)]);
      } catch (error) {
        reportParserIssue(strict, `Function value for "${_key}" threw: ${(error as Error)?.message ?? error}`);
        return undefined;
      }
    }
    if (value instanceof Promise) return processStyleEntry([key, await value]);

    if (config?.templates && config.templatePaths?.[_key]) {
      try {
        const [name, path] = config.templatePaths[_key].split(';;');

        const functions = await import(/* webpackIgnore: true */ /* @vite-ignore */ path);
        const isSaltyConfig = path.includes('salty.config');
        const values = isSaltyConfig ? functions[name].templates : functions[name];
        const template = isSaltyConfig ? values[_key] : values.params[_key];
        if (values && typeof template === 'function') {
          const templateStyles = await template(value);
          const [result] = await parseStyles(templateStyles, '');
          return result;
        }
      } catch (error) {
        console.error(`Error loading template "${_key}" from path "${config.templatePaths[_key]}"`, error);
        return undefined;
      }
    }

    if (config?.templates && config.templates[_key]) {
      if (omitTemplates) return undefined;
      const path = value.split('.');
      const templateStyles = path.reduce((acc: Record<string, any>, key: string) => acc[key], config.templates[_key]);
      if (templateStyles) {
        const [result] = await parseStyles(templateStyles, '');
        return result;
      }
      console.warn(`Template "${_key}" with path of "${value}" was not found in config!`);
      return undefined;
    }

    // Array values — coerce by comma-joining so e.g. `boxShadow: ['a', 'b']`
    // becomes "a, b" instead of being iterated as a numeric-keyed object.
    if (Array.isArray(value)) {
      if (value.length === 0) return undefined;
      return processStyleEntry([key, value.join(', ')]);
    }

    if (typeof value === 'object') {
      if (!value) return undefined;
      if (value.isColor) return toString(value.toString());

      if (_key === 'defaultVariants') return undefined;

      if (_key === 'variants') {
        const variantEntries = Object.entries(value);
        for (const [prop, conditions] of variantEntries) {
          if (!conditions) continue;
          const entries = Object.entries(conditions);
          for (const [val, styles] of entries) {
            if (!styles) continue;
            const scope = `${currentScope}.${prop}-${val}`;
            const results = await parseStyles(styles, scope, config);
            results.forEach((res) => cssStyles.add(res));
          }
        }
        return undefined;
      }

      if (_key === 'compoundVariants') {
        for (const variant of value as MultiVariant[]) {
          const { css, ...rest } = variant;
          const scope = Object.entries(rest).reduce((acc, [prop, val]) => {
            return `${acc}.${prop}-${val}`;
          }, currentScope);
          const results = await parseStyles(css as T, scope, config);
          results.forEach((res) => cssStyles.add(res));
        }
        return undefined;
      }

      if (_key === 'anyOfVariants') {
        for (const variant of value as MultiVariant[]) {
          const { css, ...rest } = variant;
          const scopes = Object.entries(rest).map(([prop, val]) => {
            return `.${prop}-${val}`;
          });
          const scope = `${currentScope}:where(${scopes.join(', ')})`;
          const results = await parseStyles(css as T, scope, config);
          results.forEach((res) => cssStyles.add(res));
        }
        return undefined;
      }

      if (_key.startsWith('@')) {
        if (bareAtRuleRegex.test(_key)) reportParserIssue(strict, `At-rule "${_key}" is missing its condition (e.g. "@media (min-width: 600px)").`);

        const mediaQuery = config?.mediaQueries?.[_key] || _key;
        const results = await parseAndJoinStyles(value, currentScope, config);
        const query = `${mediaQuery} { ${results} }`;
        cssStyles.add(query);
        return undefined;
      }

      // Empty nested object — nothing to emit; avoid recursing to keep the
      // output clean and prevent an empty `selector { }` rule.
      if (Object.keys(value).length === 0) return undefined;

      if (pseudoTypoRegex.test(_key)) {
        reportParserIssue(strict, `Selector "${_key}" looks like a missing-colon typo (did you mean "&:${_key.slice(1)}"?).`);
      }

      const scope = combineSelectors(currentScope, _key);
      const results = await parseStyles(value, scope, config);
      results.forEach((result) => cssStyles.add(result));
      return undefined;
    }

    // Property-name sanity check (these only ever produce broken CSS, so we
    // skip emission in addition to reporting under strict mode).
    if (_key.startsWith('$')) {
      reportParserIssue(strict, `Property key "${_key}" looks like a SCSS variable — Salty does not support those.`);
      return undefined;
    }
    if (_key.includes(':')) {
      reportParserIssue(strict, `Property key "${_key}" contains a colon — did you accidentally paste a whole declaration as a key?`);
      return undefined;
    }

    if (value === undefined || value === null) {
      reportParserIssue(strict, `Property "${_key}" has a ${value === undefined ? 'undefined' : 'null'} value — skipping.`);
      return undefined;
    }
    if (typeof value === 'boolean') {
      reportParserIssue(strict, `Property "${_key}" has a boolean value (${value}) — skipping.`);
      return undefined;
    }
    if (value === '') return undefined;

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        reportParserIssue(strict, `Property "${_key}" has a non-finite numeric value (${value}) — skipping.`);
        return undefined;
      }
      const withUnit = addUnit(propertyName, value, config);
      return toString(withUnit);
    }
    if (typeof value !== 'string') {
      if (value && typeof value === 'object' && 'toString' in value) value = (value as { toString(): string }).toString();
      else {
        reportParserIssue(strict, `Property "${_key}" has an unsupported value type (${typeof value}) — skipping.`);
        return undefined;
      }
    }

    if (typeof value === 'string' && templateLiteralLeftoverRegex.test(value)) {
      reportParserIssue(strict, `Property "${_key}" value "${value}" contains an unresolved \`\${...}\` — did you forget to interpolate?`);
    }

    return toString(value);
  };

  const promises = entries.map(processStyleEntry);

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

  const mapped = resolved.filter((value) => value !== undefined).join('\n\t');
  if (!mapped.trim()) return Array.from(cssStyles);

  const css = currentScope ? `${currentScope} {\n\t${mapped}\n}` : mapped;
  const alreadyExists = cssStyles.has(css);
  if (alreadyExists) return Array.from(cssStyles);
  return [css, ...cssStyles];
};

export const parseAndJoinStyles = async <T extends object>(
  styles: T,
  currentClass: string,
  config?: Partial<SaltyConfig & CachedConfig> | undefined,
  omitTemplates = false
): Promise<string> => {
  const css = await parseStyles(styles, currentClass, config, omitTemplates);
  return css.join('\n');
};

// Helper functions

const splitTopLevelCommas = (selector: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let buf = '';
  for (const ch of selector) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) {
      const trimmed = buf.trim();
      if (trimmed) parts.push(trimmed);
      buf = '';
    } else {
      buf += ch;
    }
  }
  const trimmed = buf.trim();
  if (trimmed) parts.push(trimmed);
  return parts;
};

const joinSelector = (parent: string, child: string): string => {
  if (child.includes('&')) return child.replaceAll('&', parent);
  if (child.startsWith(':')) return `${parent}${child}`;
  return `${parent} ${child}`;
};

const combineSelectors = (currentScope: string, key: string): string => {
  if (!currentScope) return key;
  const parents = splitTopLevelCommas(currentScope);
  const children = splitTopLevelCommas(key);
  if (!children.length) return currentScope;
  if (parents.length <= 1 && children.length <= 1) {
    return joinSelector(parents[0] ?? currentScope, children[0]);
  }
  const combos: string[] = [];
  for (const p of parents) {
    for (const c of children) {
      combos.push(joinSelector(p, c));
    }
  }
  return combos.join(', ');
};
