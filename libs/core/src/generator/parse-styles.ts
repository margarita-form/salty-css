import { SaltyConfig } from '../config/config-types';
import { CompoundVariant } from '../types';
import { dashCase } from '../util';

export const parseStyles = <T extends object>(
  styles: T,
  currentClass: string,
  layer?: number,
  config?: SaltyConfig | undefined
): string => {
  const classes: string[] = [];
  const current = Object.entries(styles).reduce((acc, [key, value]) => {
    const _key = key.trim();
    if (typeof value === 'object') {
      if (!value) return acc;

      if (_key === 'variants') {
        Object.entries<any>(value).forEach(([prop, conditions]) => {
          if (!conditions) return;
          Object.entries<any>(conditions).forEach(([val, styles]) => {
            if (!styles) return;
            const scope = `${currentClass}.${prop}-${val}`;
            const result = parseStyles(styles, scope, layer);
            classes.push(result);
          });
        });
        return acc;
      }

      if (_key === 'defaultVariants') {
        return acc;
      }

      if (_key === 'compoundVariants') {
        value.forEach((variant: CompoundVariant) => {
          const { css, ...rest } = variant;
          const scope = Object.entries(rest).reduce((acc, [prop, val]) => {
            return `${acc}.${prop}-${val}`;
          }, currentClass);
          const result = parseStyles(css, scope, layer);
          classes.push(result);
        });
        return acc;
      }

      if (_key.startsWith('@')) {
        const result = parseStyles(value, currentClass, layer);
        const query = `${_key} {\n ${result.replace('\n', '\n ')}\n}`;
        classes.push(query);
        return acc;
      }

      const scope = key.includes('&')
        ? _key.replace('&', currentClass)
        : _key.startsWith(':')
        ? `${currentClass}${_key}`
        : `${currentClass} ${_key}`;

      const result = parseStyles(value, scope, layer);
      classes.push(result);
      return acc;
    }

    if (config?.templates && config.templates[_key]) {
      const path = value.split('.');
      const templateStyles = path.reduce(
        (acc: Record<string, any>, key: string) => acc[key],
        config.templates[_key]
      );
      const result = parseStyles(templateStyles, '');
      return `${acc}${result}`;
    }

    const propertyName = _key.startsWith('-') ? _key : dashCase(_key);
    const addValue = (val: unknown) => `${acc}${propertyName}:${val};`;

    if (typeof value === 'number') return addValue(value);
    if (typeof value !== 'string') return acc;

    const hasToken = /\{[^{}]+\}/g.test(value);
    if (hasToken) {
      const tokens = value.replace(/\{([^{}]+)\}/g, (...args) => {
        const variable = dashCase(args[1].replaceAll('.', '-'));
        return `var(--${variable})`;
      });
      return addValue(tokens);
    }

    return addValue(value);
  }, '');

  if (!current) return classes.join('\n');
  if (!currentClass) return current;

  let css = '';
  if (layer !== undefined)
    css = `@layer l${layer} { ${currentClass} { ${current} } }`;
  else css = `${currentClass} { ${current} }`;

  return [css, ...classes].join('\n');
};
