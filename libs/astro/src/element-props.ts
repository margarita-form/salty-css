/* eslint-disable @typescript-eslint/no-explicit-any */
import { dashCase } from '@salty-css/core/util';
import { parseVariableTokens } from '@salty-css/core/parsers';
import { StyledGeneratorClientProps } from '@salty-css/core/generators';

const _styledKeys = ['passProps'];

export interface ResolvedAstroProps {
  class: string[];
  style: Record<string, any>;
  rest: Record<string, any>;
  element?: string;
  _vks: string[];
}

/**
 * SSR equivalent of the React `elementFactory`. Takes the raw `Astro.props` of a
 * generated `.astro` Salty component plus the build-time generator props and
 * returns cleaned values ready to apply on the underlying `<Element>` tag:
 *
 * - `class` — array for `class:list`
 * - `style` — object for `style={}`
 * - `rest` — object to `{...spread}` onto the element (variants and `css-*` props removed unless `passProps` allows)
 * - `element` — runtime element override
 * - `_vks` — variant keys consumed at this level, forwarded so wrapping styled components can keep stripping them
 */
export const resolveAstroProps = (
  astroProps: Record<string, any> = {},
  generatorProps: StyledGeneratorClientProps = {},
  baseClassName = '',
  additionalProps?: Record<string, any>
): ResolvedAstroProps => {
  const {
    class: incomingClass = '',
    className: incomingClassName,
    element: consumerElement,
    passProps = generatorProps.passProps,
    _vks: incomingVks,
    style: incomingStyle,
    ...rawProps
  } = astroProps;

  const passedProps: Record<string, any> = { passProps };
  if (generatorProps.attr) {
    for (const [key, value] of Object.entries(generatorProps.attr)) {
      if (value !== undefined) passedProps[key] = value;
    }
  }
  if (additionalProps) Object.assign(passedProps, additionalProps);

  const props: Record<string, any> = { ...rawProps };
  if (generatorProps.defaultProps) {
    for (const [key, value] of Object.entries(generatorProps.defaultProps)) {
      if (props[key] === undefined) props[key] = value;
    }
  }
  Object.assign(passedProps, props);

  const classes = new Set<string>();
  for (const c of String(baseClassName).split(' ')) if (c) classes.add(c);
  for (const c of String(incomingClass || '').split(' ')) if (c) classes.add(c);
  for (const c of String(incomingClassName || '').split(' ')) if (c) classes.add(c);

  const style: Record<string, any> = {};
  if (incomingStyle && typeof incomingStyle === 'object') {
    for (const [key, value] of Object.entries(incomingStyle)) {
      const parsed = parseVariableTokens(value);
      style[key] = parsed ? parsed.transformed : value;
    }
  }

  const vks = new Set<string>(Array.isArray(incomingVks) ? incomingVks : []);

  if (generatorProps.propValueKeys) {
    for (const key of generatorProps.propValueKeys) {
      const propName = `css-${key}`;
      const value = props[propName];
      if (value === undefined) continue;
      style[`--props-${dashCase(key)}`] = value;
      vks.add(propName);
    }
  }

  if (generatorProps.variantKeys) {
    for (const key of generatorProps.variantKeys) {
      const [name, defaultValue] = key.split('=');
      if (props[name] !== undefined) {
        classes.add(`${name}-${props[name]}`);
        vks.add(name);
      } else if (defaultValue !== undefined) {
        classes.add(`${name}-${defaultValue}`);
      }
    }
  }

  for (const vk of vks) {
    if (passProps === true) continue;
    if (Array.isArray(passProps) && passProps.includes(vk)) continue;
    if (typeof passProps === 'string' && passProps === vk) continue;
    delete passedProps[vk];
  }
  for (const key of _styledKeys) delete passedProps[key];

  return {
    class: [...classes],
    style,
    rest: passedProps,
    element: consumerElement || generatorProps.element,
    _vks: [...vks],
  };
};
