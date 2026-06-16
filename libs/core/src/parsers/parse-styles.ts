/* eslint-disable @typescript-eslint/no-explicit-any */
import { CachedConfig, SaltyConfig } from '../types/config-types';
import { MultiVariant } from '../types';
import { parseValueModifiers } from './parse-modifiers';
import { parseValueTokens } from './parse-tokens';
import { addUnit } from './unit-check';
import { propertyNameCheck } from './property-name-check';
import { StyleValueModifierFunction } from './parser-types';
import { reportParserIssue, StrictMode } from './strict';
import { bareAtRuleRegex, keyframesAtRuleRegex, pseudoTypoRegex, templateLiteralLeftoverRegex } from './parser-regexes';
import { parseTemplateCallSite, pathHasRichNode, resolveRichTemplate } from './resolve-template-variants';

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
  omitTemplates = false,
): Promise<string[]> => {
  if (!styles) throw new Error('No styles provided to parseStyles function!');
  const entries = Object.entries(styles);
  const strict: StrictMode = (config as { strict?: StrictMode } | undefined)?.strict;

  // Heuristic warning for overlapping media queries declared in a
  // cascade-breaking order (e.g. a wider max-width after a narrower one).
  checkMediaQueryOrder(entries, config, strict);

  // Each entry produces at most one direct declaration (`value`) plus any
  // number of nested rules (`nested`) — media queries, variants, child
  // selectors, etc. Nested rules are returned (not pushed to a shared Set
  // mid-flight) so that, after the concurrent `Promise.all`, they can be
  // assembled in source-declaration order instead of async-completion order.
  const processStyleEntry = async ([key, value]: [key: string, any]): Promise<EntryResult> => {
    const _key = key.trim().replace(/^\?+/g, '');
    const propertyName = propertyNameCheck(_key);
    const nested: string[] = [];

    const declaration = (val?: string): EntryResult => ({ value: val, nested });
    const toString = (val: unknown, eol = ';') => `${propertyName}:${val}${eol}`;
    const context = { scope: currentScope, config }; // todo, add typing and add custom context options

    if (typeof value === 'function') {
      try {
        return await processStyleEntry([key, value(context)]);
      } catch (error) {
        reportParserIssue(strict, `Function value for "${_key}" threw: ${(error as Error)?.message ?? error}`);
        return declaration();
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
          return declaration(result);
        }
      } catch (error) {
        console.error(`Error loading template "${_key}" from path "${config.templatePaths[_key]}"`, error);
        return declaration();
      }
    }

    if (config?.templates && config.templates[_key]) {
      if (omitTemplates) return declaration();
      const root = config.templates[_key];
      const callSite = parseTemplateCallSite(value);
      if (callSite) {
        const { path, variants } = callSite;
        const hasCallSiteVariants = Object.keys(variants).length > 0;
        if (hasCallSiteVariants || pathHasRichNode(root, path)) {
          const resolved = resolveRichTemplate(root, path, variants, _key);
          if (resolved) {
            const [result] = await parseStyles(resolved, '');
            return declaration(result);
          }
          console.warn(`Template "${_key}" with path of "${path.join('.')}" was not found in config!`);
          return declaration();
        }
        // Legacy flat path — unchanged from prior behavior.
        const templateStyles = path.reduce((acc: Record<string, any>, key: string) => acc?.[key], root as Record<string, any>);
        if (templateStyles) {
          const [result] = await parseStyles(templateStyles, '');
          return declaration(result);
        }
        console.warn(`Template "${_key}" with path of "${path.join('.')}" was not found in config!`);
        return declaration();
      }
      console.warn(`Template "${_key}" received an unsupported call-site value.`);
      return declaration();
    }

    // Array values — coerce by comma-joining so e.g. `boxShadow: ['a', 'b']`
    // becomes "a, b" instead of being iterated as a numeric-keyed object.
    // `compoundVariants` / `anyOfVariants` are arrays too but have dedicated
    // branches in the object-handler below; skip the coercion for them.
    const isVariantArrayKey = _key === 'compoundVariants' || _key === 'anyOfVariants';
    if (!isVariantArrayKey && Array.isArray(value)) {
      if (value.length === 0) return declaration();
      return processStyleEntry([key, value.join(', ')]);
    }

    if (typeof value === 'object') {
      if (!value) return declaration();
      if (value.isColor) return declaration(toString(value.toString()));
      if (value.isDefineFont) return declaration(toString(value.toString()));

      if (_key === 'defaultVariants') return declaration();

      if (_key === 'variants') {
        const variantEntries = Object.entries(value);
        for (const [prop, conditions] of variantEntries) {
          if (!conditions) continue;
          const entries = Object.entries(conditions);
          for (const [val, styles] of entries) {
            if (!styles) continue;
            const scope = `${currentScope}.${prop}-${val}`;
            const results = await parseStyles(styles, scope, config);
            results.forEach((res) => nested.push(res));
          }
        }
        return declaration();
      }

      if (_key === 'compoundVariants') {
        for (const variant of value as MultiVariant[]) {
          const { css, ...rest } = variant;
          const scope = Object.entries(rest).reduce((acc, [prop, val]) => {
            return `${acc}.${prop}-${val}`;
          }, currentScope);
          const results = await parseStyles(css as T, scope, config);
          results.forEach((res) => nested.push(res));
        }
        return declaration();
      }

      if (_key === 'anyOfVariants') {
        for (const variant of value as MultiVariant[]) {
          const { css, ...rest } = variant;
          const scopes = Object.entries(rest).map(([prop, val]) => {
            return `.${prop}-${val}`;
          });
          const scope = `${currentScope}:where(${scopes.join(', ')})`;
          const results = await parseStyles(css as T, scope, config);
          results.forEach((res) => nested.push(res));
        }
        return declaration();
      }

      // Global escape hatch: emit child selectors unscoped (scope reset to '').
      // Mirrors how keyframes reset scope to avoid inheriting the component class.
      if (_key === 'global') {
        const results = await parseStyles(value, '', config);
        results.forEach((res) => nested.push(res));
        return declaration();
      }

      if (_key.startsWith('@')) {
        if (bareAtRuleRegex.test(_key)) reportParserIssue(strict, `At-rule "${_key}" is missing its condition (e.g. "@media (min-width: 600px)").`);

        // Keyframes are inherently global: their children (`0%`, `from`, `to`)
        // are pseudo-selectors, not nested rules. Reset scope so they emit
        // as standalone blocks instead of being combined with the parent.
        const innerScope = keyframesAtRuleRegex.test(_key) ? '' : currentScope;
        const mediaQuery = config?.mediaQueries?.[_key] || _key;
        const results = await parseAndJoinStyles(value, innerScope, config);
        const query = `${mediaQuery} { ${results} }`;
        nested.push(query);
        return declaration();
      }

      // Empty nested object — nothing to emit; avoid recursing to keep the
      // output clean and prevent an empty `selector { }` rule.
      if (Object.keys(value).length === 0) return declaration();

      if (pseudoTypoRegex.test(_key)) {
        reportParserIssue(strict, `Selector "${_key}" looks like a missing-colon typo (did you mean "&:${_key.slice(1)}"?).`);
      }

      const scope = combineSelectors(currentScope, _key);
      const results = await parseStyles(value, scope, config);
      results.forEach((result) => nested.push(result));
      return declaration();
    }

    // Property-name sanity check (these only ever produce broken CSS, so we
    // skip emission in addition to reporting under strict mode).
    if (_key.startsWith('$')) {
      reportParserIssue(strict, `Property key "${_key}" looks like a SCSS variable — Salty does not support those.`);
      return declaration();
    }
    if (_key.includes(':')) {
      reportParserIssue(strict, `Property key "${_key}" contains a colon — did you accidentally paste a whole declaration as a key?`);
      return declaration();
    }

    if (value === undefined || value === null) {
      reportParserIssue(strict, `Property "${_key}" has a ${value === undefined ? 'undefined' : 'null'} value — skipping.`);
      return declaration();
    }
    if (typeof value === 'boolean') {
      reportParserIssue(strict, `Property "${_key}" has a boolean value (${value}) — skipping.`);
      return declaration();
    }
    if (value === '') return declaration();

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        reportParserIssue(strict, `Property "${_key}" has a non-finite numeric value (${value}) — skipping.`);
        return declaration();
      }
      const withUnit = addUnit(propertyName, value, config);
      return declaration(toString(withUnit));
    }
    if (typeof value !== 'string') {
      if (value && typeof value === 'object' && 'toString' in value) value = (value as { toString(): string }).toString();
      else {
        reportParserIssue(strict, `Property "${_key}" has an unsupported value type (${typeof value}) — skipping.`);
        return declaration();
      }
    }

    if (typeof value === 'string' && templateLiteralLeftoverRegex.test(value)) {
      reportParserIssue(strict, `Property "${_key}" value "${value}" contains an unresolved \`\${...}\` — did you forget to interpolate?`);
    }

    return declaration(toString(value));
  };

  const { modifiers } = config || {};

  const afterFunctions: StyleValueModifierFunction[] = [parseValueTokens(), parseValueModifiers(modifiers)];

  // Run every entry concurrently; `Promise.all` preserves source order so both
  // direct declarations and nested rules stay in the order the user declared.
  const results = await Promise.all(entries.map(processStyleEntry));

  const resolved = await Promise.all(
    results.map(({ value }) => {
      if (value === undefined) return Promise.resolve(undefined);
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
      }, Promise.resolve(value));
    }),
  );

  // Assemble nested rules in declaration order, de-duplicated (a Set preserves
  // insertion order in JS, so this keeps both order and the prior dedup).
  const cssStyles = new Set<string>();
  for (const { nested } of results) {
    for (const rule of nested) cssStyles.add(rule);
  }

  const mapped = resolved.filter((value) => value !== undefined).join('\n\t');
  if (!mapped.trim()) return Array.from(cssStyles);

  const css = currentScope ? `${currentScope} {\n\t${mapped}\n}` : mapped;
  const alreadyExists = cssStyles.has(css);
  if (alreadyExists) return Array.from(cssStyles);
  return [css, ...cssStyles];
};

interface EntryResult {
  value?: string;
  nested: string[];
}

export const parseAndJoinStyles = async <T extends object>(
  styles: T,
  currentClass: string,
  config?: Partial<SaltyConfig & CachedConfig> | undefined,
  omitTemplates = false,
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

// Matches a single width bound, e.g. the `(max-width: 960px)` inside a query.
const widthBoundRegex = /\((max|min)-width:\s*([\d.]+)(px|r?em)\)/g;

/**
 * Heuristic: warn when overlapping single-bound media queries are declared in
 * a cascade-breaking order. `max-width` queries should be declared widest →
 * narrowest (so the narrower one wins at small viewports) and `min-width`
 * queries narrowest → widest. A later query that is wider (max-width) / narrower
 * (min-width) than an earlier same-unit one silently overrides it.
 *
 * Combined/range queries (more than one width bound) and cross-unit pairs are
 * intentionally skipped — their ordering can legitimately be non-monotonic.
 */
const checkMediaQueryOrder = (entries: [string, unknown][], config: Partial<SaltyConfig & CachedConfig> | CachedConfig | undefined, strict: StrictMode): void => {
  // `reportParserIssue` is a no-op unless strict reporting is enabled, so skip
  // the scan entirely in the common (non-strict) case.
  if (!strict) return;

  // Per-unit running bounds: the narrowest max-width and widest min-width seen
  // so far, plus the key that established each (for the warning message).
  const minMaxWidth: Record<string, { value: number; key: string }> = {};
  const maxMinWidth: Record<string, { value: number; key: string }> = {};

  for (const [key, value] of entries) {
    const _key = key.trim().replace(/^\?+/g, '');
    if (!_key.startsWith('@') || typeof value !== 'object' || !value) continue;

    const query = config?.mediaQueries?.[_key] || _key;
    const bounds = [...query.matchAll(widthBoundRegex)];
    if (bounds.length !== 1) continue; // skip combined/range or non-width queries

    const [, bound, rawValue, unit] = bounds[0];
    const numeric = parseFloat(rawValue);

    if (bound === 'max') {
      const prev = minMaxWidth[unit];
      if (prev && numeric > prev.value) {
        reportParserIssue(
          'warn', // this is a heuristic, not an outright error, so we don't want to throw even in strict mode
          `Media query "${_key}" (max-width: ${numeric}${unit}) is declared after "${prev.key}" (max-width: ${prev.value}${unit}); wider max-width queries override narrower ones at overlapping widths — order them widest → narrowest.`,
        );
      }
      if (!prev || numeric < prev.value) minMaxWidth[unit] = { value: numeric, key: _key };
    } else {
      const prev = maxMinWidth[unit];
      if (prev && numeric < prev.value) {
        reportParserIssue(
          'warn', // this is a heuristic, not an outright error, so we don't want to throw even in strict mode
          `Media query "${_key}" (min-width: ${numeric}${unit}) is declared after "${prev.key}" (min-width: ${prev.value}${unit}); narrower min-width queries are overridden by wider ones at overlapping widths — order them narrowest → widest.`,
        );
      }
      if (!prev || numeric > prev.value) maxMinWidth[unit] = { value: numeric, key: _key };
    }
  }
};
