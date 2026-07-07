/* eslint-disable @typescript-eslint/no-explicit-any */
import { dashCase, sanitizeClassName } from '@salty-css/core/util';
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
 * generated `.astro` Salty component plus the build-time client props and
 * returns cleaned values ready to apply on the underlying `<Element>` tag:
 *
 * - `class` — array for `class:list`
 * - `style` — object for `style={}`
 * - `rest` — object to `{...spread}` onto the element (variants and `css-*` props removed unless `passProps` allows)
 * - `element` — runtime element override
 * - `_vks` — variant keys consumed at this level, forwarded so wrapping styled components can keep stripping them
 *
 * When `extendsStyled` is set (the component extends another Salty styled
 * component), consumed variant keys are kept in `rest` so the inner component
 * receives them, matching React's `deleteVKS = !extendsComponent || !extendsStyled`.
 */
export const resolveAstroProps = (
  astroProps: Record<string, any> = {},
  clientProps: StyledGeneratorClientProps = {},
  baseClassName = '',
  additionalProps?: Record<string, any>,
  extendsStyled = false,
): ResolvedAstroProps => {
  const {
    class: incomingClass = '',
    className: incomingClassName,
    element: consumerElement,
    as: consumerAs,
    passProps = clientProps.passProps,
    _vks: incomingVks,
    style: incomingStyle,
    ...rawProps
  } = astroProps;

  const passedProps: Record<string, any> = { passProps };
  if (clientProps.attr) {
    for (const [key, value] of Object.entries(clientProps.attr)) {
      if (value !== undefined) passedProps[key] = value;
    }
  }
  if (additionalProps) Object.assign(passedProps, additionalProps);

  const props: Record<string, any> = { ...rawProps };
  // React parity (element-factory.ts): `Object.assign(props, defaultProps)` lets
  // defaultProps override consumer-supplied props. Replicated here so SSR matches
  // CSR; if that precedence is ever deemed a React bug it must be fixed in both.
  if (clientProps.defaultProps) Object.assign(props, clientProps.defaultProps);
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

  if (clientProps.propValueKeys) {
    for (const key of clientProps.propValueKeys) {
      const propName = `css-${key}`;
      const value = props[propName];
      if (value === undefined) continue;
      style[`--props-${dashCase(key)}`] = value;
      vks.add(propName);
    }
  }

  if (clientProps.variantKeys) {
    for (const key of clientProps.variantKeys) {
      const [name, defaultValue] = key.split('=');
      if (props[name] !== undefined) {
        const variantClass = sanitizeClassName(`${name}-${props[name]}`);
        classes.add(variantClass);
        vks.add(name);
      } else if (defaultValue !== undefined) {
        const variantClass = sanitizeClassName(`${name}-${defaultValue}`);
        classes.add(variantClass);
      }
    }
  }

  // Extending another styled component: forward the variant keys (and the `_vks`
  // set) untouched so the inner component resolves and strips them.
  if (!extendsStyled) {
    for (const vk of vks) {
      if (passProps === true) continue;
      if (Array.isArray(passProps) && passProps.includes(vk)) continue;
      if (typeof passProps === 'string' && passProps === vk) continue;
      delete passedProps[vk];
    }
  }
  for (const key of _styledKeys) delete passedProps[key];

  return {
    class: [...classes],
    style,
    rest: passedProps,
    element: consumerAs ?? consumerElement ?? clientProps.element,
    _vks: [...vks],
  };
};
