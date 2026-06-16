/* eslint-disable @typescript-eslint/no-explicit-any */
import { RichTemplateNode } from '../types/config-types';
import { dashCase, toHash } from '../util';
import { parseAndJoinStyles } from './parse-styles';
import { isRichTemplateNode } from './resolve-template-variants';

const RICH_META_KEYS = new Set(['base', 'variants', 'defaultVariants', 'compoundVariants', 'anyOfVariants']);

const isChildEntry = (key: string, value: unknown): boolean => {
  if (RICH_META_KEYS.has(key)) return false;
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

export const parseTemplates = async <T extends object>(obj: T, path: PropertyKey[] = []): Promise<string> => {
  if (!obj) return '';
  const classes: string[] = [];

  if (isRichTemplateNode(obj)) {
    const rich = obj as RichTemplateNode;
    const baseClassName = path.map((p) => dashCase(String(p))).join('-');
    if (rich.base) {
      const hashClass = 't_' + toHash(baseClassName, 4);
      const result = await parseAndJoinStyles(rich.base as Record<string, any>, `.${baseClassName}, .${hashClass}`);
      classes.push(result);
    }
    if (rich.variants) {
      for (const [axis, valueMap] of Object.entries(rich.variants as Record<string, Record<string, any>>)) {
        if (!valueMap || typeof valueMap !== 'object') continue;
        for (const [value, styles] of Object.entries(valueMap)) {
          if (!styles || typeof styles !== 'object') continue;
          const variantClassName = `${baseClassName}-${dashCase(axis)}-${dashCase(value)}`;
          const variantHashClass = 'tv_' + toHash(variantClassName, 4);
          const result = await parseAndJoinStyles(styles as Record<string, any>, `.${variantClassName}, .${variantHashClass}`);
          classes.push(result);
        }
      }
    }
    for (const [key, value] of Object.entries(rich)) {
      if (!isChildEntry(key, value)) continue;
      const result = await parseTemplates(value as object, [...path, key.trim()]);
      classes.push(result);
    }
    return classes.join('\n');
  }

  const levelStyles = {} as Record<PropertyKey, any>;

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'function') {
      // Skip functions
    } else if (value && typeof value === 'object') {
      const _key = key.trim();
      const result = await parseTemplates(value, [...path, _key]);
      classes.push(result);
    } else {
      levelStyles[key] = value;
    }
  }

  if (Object.keys(levelStyles).length) {
    const className = path.map((p) => dashCase(String(p))).join('-');
    const hashClass = 't_' + toHash(className, 4);
    const result = await parseAndJoinStyles(levelStyles, `.${className}, .${hashClass}`);
    classes.push(result);
  }

  return classes.join('\n');
};

export const getTemplateKeys = <T extends object>(templates: T): string[] => {
  return Object.keys(templates);
};

export const getTemplateTypes = <T extends object>(templates: T): Record<string, string> => {
  if (!templates) return {};
  return Object.entries(templates).reduce(
    (acc, [key, value]) => {
      if (typeof value === 'function') {
        acc[key] = 'any';
      } else if (typeof value === 'object')
        acc[key] = getTemplateTokens(value)
          .map((val) => `"${val}"`)
          .join(' | ');
      return acc;
    },
    {} as Record<string, string>,
  );
};

export const getTemplateTokens = <T extends object>(templates: T, parent = '', templateTokens = new Set<string>()): string[] => {
  if (!templates) return [];

  if (isRichTemplateNode(templates)) {
    // A rich node is itself a valid template path (parent ref).
    if (parent) templateTokens.add(parent);
    Object.entries(templates as Record<string, any>).forEach(([key, value]) => {
      if (!isChildEntry(key, value)) return;
      const keyValue = parent ? `${parent}.${key}` : key;
      getTemplateTokens(value, keyValue, templateTokens);
    });
    return [...templateTokens];
  }

  Object.entries(templates).forEach(([key, value]) => {
    const keyValue = parent ? `${parent}.${key}` : key;
    if (value && typeof value === 'object') return getTemplateTokens(value, keyValue, templateTokens);
    return templateTokens.add(parent);
  });

  return [...templateTokens];
};

/**
 * Walk every rich-template path in a templates root and emit, for each reachable dot-path, the set of
 * variant axes valid at that path (axis name → union of value names, with `boolean` for axes whose only
 * declared value is `true`).
 *
 * Inheritance: a leaf's axis enum is the union of its own values and every ancestor's values for the
 * same axis. Matches the resolver's bottom-up lookup semantics — anything reachable via fallback is a
 * valid call-site value.
 */
export const getTemplateVariantMaps = (templates: Record<string, any>): Record<string, Record<string, Record<string, string>>> => {
  const result: Record<string, Record<string, Record<string, string>>> = {};
  if (!templates) return result;

  for (const [topKey, topNode] of Object.entries(templates)) {
    if (!topNode || typeof topNode !== 'object' || typeof topNode === 'function') continue;
    walk(topNode, [], result[topKey] || (result[topKey] = {}), {});
  }
  return result;
};

const mergeAxes = (inherited: Record<string, Record<string, true>>, node: any): Record<string, Record<string, true>> => {
  const next: Record<string, Record<string, true>> = {};
  for (const [axis, vals] of Object.entries(inherited)) {
    next[axis] = { ...vals };
  }
  if (isRichTemplateNode(node) && node.variants) {
    for (const [axis, valueMap] of Object.entries(node.variants as Record<string, Record<string, any>>)) {
      next[axis] = next[axis] || {};
      for (const value of Object.keys(valueMap)) next[axis][value] = true;
    }
  }
  return next;
};

const walk = (node: any, path: string[], out: Record<string, Record<string, string>>, inheritedAxes: Record<string, Record<string, true>>) => {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return;
  const axes = mergeAxes(inheritedAxes, node);
  const dot = path.join('.');
  if (path.length && (isRichTemplateNode(node) || Object.keys(axes).length)) {
    const axisMap: Record<string, string> = {};
    for (const [axis, valSet] of Object.entries(axes)) {
      const values = Object.keys(valSet);
      const isBooleanOnly = values.length === 1 && values[0] === 'true';
      axisMap[axis] = isBooleanOnly ? 'boolean' : values.map((v) => `"${v}"`).join(' | ');
    }
    if (Object.keys(axisMap).length) out[dot] = axisMap;
  }
  if (isRichTemplateNode(node)) {
    for (const [key, value] of Object.entries(node as Record<string, any>)) {
      if (!isChildEntry(key, value)) continue;
      walk(value, [...path, key.trim()], out, axes);
    }
    return;
  }
  for (const [key, value] of Object.entries(node as Record<string, any>)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    walk(value, [...path, key.trim()], out, axes);
  }
};
