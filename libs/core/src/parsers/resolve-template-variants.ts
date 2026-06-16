/* eslint-disable @typescript-eslint/no-explicit-any */
import { CssCompoundVariant, RichTemplateNode } from '../types/config-types';

export type TemplateCallSite = {
  path: string[];
  variants: Record<string, string | boolean>;
};

export const isRichTemplateNode = (node: unknown): node is RichTemplateNode => {
  if (!node || typeof node !== 'object') return false;
  if (Array.isArray(node)) return false;
  const keys = Object.keys(node as object);
  return keys.includes('base') || keys.includes('variants');
};

/**
 * Parse a template call-site value into its dot-path and the axis values requested at the call site.
 *
 * String form:  `'heading.large@weight=heavy&emphasis=loud&italic'`
 * Object form:  `{ name: 'heading.large', weight: 'heavy', emphasis: 'loud', italic: true }`
 */
export const parseTemplateCallSite = (value: unknown): TemplateCallSite | undefined => {
  if (typeof value === 'string') {
    const [rawPath, rawQuery] = value.split('@', 2);
    const path = rawPath.split('.').filter(Boolean);
    if (!path.length) return undefined;
    const variants: Record<string, string | boolean> = {};
    if (rawQuery) {
      for (const segment of rawQuery.split('&')) {
        if (!segment) continue;
        const eq = segment.indexOf('=');
        if (eq === -1) {
          variants[segment.trim()] = true;
        } else {
          const axis = segment.slice(0, eq).trim();
          const raw = segment.slice(eq + 1).trim();
          if (!axis) continue;
          if (raw === 'true') variants[axis] = true;
          else if (raw === 'false') variants[axis] = false;
          else variants[axis] = raw;
        }
      }
    }
    return { path, variants };
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const name = obj['name'];
    if (typeof name !== 'string') return undefined;
    const path = name.split('.').filter(Boolean);
    if (!path.length) return undefined;
    const variants: Record<string, string | boolean> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'name') continue;
      if (typeof v === 'string' || typeof v === 'boolean') variants[k] = v;
    }
    return { path, variants };
  }
  return undefined;
};

const normalizeAxisValue = (v: string | boolean | undefined): string | undefined => {
  if (v === undefined) return undefined;
  return typeof v === 'boolean' ? String(v) : v;
};

type Stack = Array<{ node: any; isRich: boolean }>;

/**
 * Walk the dot-path against the template root and return a stack of nodes encountered (root → leaf).
 * Returns undefined if the path doesn't resolve.
 */
const buildPathStack = (root: any, path: string[]): Stack | undefined => {
  const stack: Stack = [{ node: root, isRich: isRichTemplateNode(root) }];
  let cursor: any = root;
  for (const segment of path) {
    if (cursor == null || typeof cursor !== 'object') return undefined;
    const next = cursor[segment];
    if (next === undefined) return undefined;
    stack.push({ node: next, isRich: isRichTemplateNode(next) });
    cursor = next;
  }
  return stack;
};

export const pathHasRichNode = (root: any, path: string[]): boolean => {
  const stack = buildPathStack(root, path);
  if (!stack) return false;
  return stack.some((entry) => entry.isRich);
};

const matchesAll = (entry: CssCompoundVariant, effective: Record<string, string | undefined>): boolean => {
  for (const [axis, raw] of Object.entries(entry)) {
    if (axis === 'css') continue;
    if (effective[axis] !== normalizeAxisValue(raw)) return false;
  }
  return true;
};

const matchesAny = (entry: CssCompoundVariant, effective: Record<string, string | undefined>): boolean => {
  let any = false;
  for (const [axis, raw] of Object.entries(entry)) {
    if (axis === 'css') continue;
    any = true;
    if (effective[axis] === normalizeAxisValue(raw)) return true;
  }
  return !any;
};

/**
 * Resolve a rich-template invocation into a flat CSS-in-JS object.
 * Implements docs/template-variants-spec.md §5 (parent-to-leaf inheritance, replace semantics).
 *
 * Returns `undefined` if the path doesn't resolve. Emits console.warn for unknown axes / values.
 */
export const resolveRichTemplate = (root: any, path: string[], callSiteVariants: Record<string, string | boolean>, templateName: string): Record<string, any> | undefined => {
  const stack = buildPathStack(root, path);
  if (!stack) return undefined;

  // Pull rich payloads (or treat plain CssStyles leaves as `{ base: leaf }` for uniform handling).
  const rich = stack.map((entry) => {
    if (entry.isRich) return entry.node as RichTemplateNode;
    if (entry.node && typeof entry.node === 'object' && !Array.isArray(entry.node)) {
      // Plain leaf — treat as { base: leaf } so accumulation still works on mixed paths.
      const onlyChildKeys = Object.keys(entry.node).every((k) => entry.node[k] && typeof entry.node[k] === 'object' && !isRichTemplateNode(entry.node[k]));
      // If the node is only intermediate (all children are themselves nodes), skip it — no inline base.
      // Otherwise it's a styles leaf.
      return onlyChildKeys ? ({} as RichTemplateNode) : ({ base: entry.node } as RichTemplateNode);
    }
    return {} as RichTemplateNode;
  });

  // Step 1: compute effective axis values. Collect every axis declared anywhere on the path.
  const declaredAxes = new Set<string>();
  for (const r of rich) {
    if (r.variants) for (const k of Object.keys(r.variants)) declaredAxes.add(k);
  }
  // Plus axes that only appear in defaults / compound / anyOf are still relevant for rule matching.
  for (const r of rich) {
    if (r.defaultVariants) for (const k of Object.keys(r.defaultVariants)) declaredAxes.add(k);
  }

  const effective: Record<string, string | undefined> = {};
  for (const axis of declaredAxes) {
    if (axis in callSiteVariants) {
      effective[axis] = normalizeAxisValue(callSiteVariants[axis]);
      continue;
    }
    // Bottom-up walk for defaultVariants.
    for (let i = rich.length - 1; i >= 0; i--) {
      const d = rich[i].defaultVariants?.[axis];
      if (d !== undefined) {
        effective[axis] = normalizeAxisValue(d);
        break;
      }
    }
  }

  // Warn about unknown axes / values at the call site.
  for (const [axis, raw] of Object.entries(callSiteVariants)) {
    if (!declaredAxes.has(axis)) {
      console.warn(`Template "${templateName}" path "${path.join('.')}" has no variant axis "${axis}"; ignored.`);
      continue;
    }
    const wanted = normalizeAxisValue(raw);
    // Check at least one node declares this axis-value.
    let found = false;
    for (const r of rich) {
      if (r.variants?.[axis] && wanted !== undefined && wanted in r.variants[axis]) {
        found = true;
        break;
      }
    }
    if (!found && wanted !== undefined) {
      // It might still be matched only by compound/anyOf rules. That's acceptable per spec — emit a
      // softer warning only when no axis bundle exists at all.
      const anyBundle = rich.some((r) => r.variants && axis in r.variants);
      if (anyBundle) {
        console.warn(`Template "${templateName}" axis "${axis}" has no value "${wanted}" on path "${path.join('.')}"; ignored.`);
      }
    }
  }

  // Step 2: accumulate base top-down.
  const acc: Record<string, any> = {};
  for (const r of rich) {
    if (r.base) Object.assign(acc, r.base);
  }

  // Step 3: for each effective axis, find the bundle bottom-up and apply (replace semantics).
  for (const axis of Object.keys(effective)) {
    const value = effective[axis];
    if (value === undefined) continue;
    for (let i = rich.length - 1; i >= 0; i--) {
      const bundle = rich[i].variants?.[axis]?.[value];
      if (bundle) {
        Object.assign(acc, bundle);
        break;
      }
    }
  }

  // Step 4: apply compound and any-of rules top-down.
  for (const r of rich) {
    if (r.compoundVariants) {
      for (const entry of r.compoundVariants) {
        if (matchesAll(entry, effective) && entry.css) Object.assign(acc, entry.css);
      }
    }
    if (r.anyOfVariants) {
      for (const entry of r.anyOfVariants) {
        if (matchesAny(entry, effective) && entry.css) Object.assign(acc, entry.css);
      }
    }
  }

  return acc;
};
