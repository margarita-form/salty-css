import { SaltyConfig } from '../types/config-types';
import { CompoundVariant } from '../types';
import { parseValueModifiers } from './parse-modifiers';
import { parseValueTokens } from './parse-tokens';
import { addUnit } from './unit-check';
import { propertyNameCheck } from './property-name-check';

export const parseStyles = <T extends object>(styles: T, currentClass: string, config?: SaltyConfig | undefined): string => {
  if (!styles) return '';
  const classes: string[] = [];
  const current = Object.entries(styles).reduce((acc, [key, value]) => {
    const _key = key.trim();

    const propertyName = propertyNameCheck(_key);
    const appendString = (val: string, eol = ';') => (acc = `${acc}${val}${eol}`);
    const appendValue = (val: unknown) => appendString(`${propertyName}:${val}`);

    if (typeof value === 'function') value = value();

    if (typeof value === 'object') {
      if (!value) return acc;

      if (value.isColor) {
        appendValue(value.toString());
        return acc;
      }

      if (_key === 'variants') {
        Object.entries<any>(value).forEach(([prop, conditions]) => {
          if (!conditions) return;
          Object.entries<any>(conditions).forEach(([val, styles]) => {
            if (!styles) return;
            const scope = `${currentClass}.${prop}-${val}`;
            const result = parseStyles(styles, scope, config);
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
          const result = parseStyles(css as T, scope, config);
          classes.push(result);
        });
        return acc;
      }

      if (_key.startsWith('@')) {
        const result = parseStyles(value, currentClass, config);
        const query = `${_key} {\n ${result.replace('\n', '\n ')}\n}`;
        classes.push(query);
        return acc;
      }

      const scope = key.includes('&') ? _key.replace('&', currentClass) : _key.startsWith(':') ? `${currentClass}${_key}` : `${currentClass} ${_key}`;

      const result = parseStyles(value, scope, config);
      classes.push(result);
      return acc;
    }

    if (config?.templates && config.templates[_key]) {
      const path = value.split('.');
      const templateStyles = path.reduce((acc: Record<string, any>, key: string) => acc[key], config.templates[_key]);
      if (templateStyles) {
        const result = parseStyles(templateStyles, '');
        return `${acc}${result}`;
      }
      console.warn(`Template "${_key}" with path of "${value}" was not found in config!`);
      return acc;
    }

    if (typeof value === 'number') {
      const withUnit = addUnit(propertyName, value, config);
      return appendValue(withUnit);
    }
    if (typeof value !== 'string') {
      if ('toString' in value) value = value.toString();
      else return acc;
    }

    const { modifiers } = config || {};
    const runParsers = function* () {
      yield parseValueTokens(value);
      yield parseValueModifiers(value, modifiers);
    };

    const generator = runParsers();

    for (const { result, additionalCss = [] } of generator) {
      value = result;
      additionalCss.forEach((css) => {
        const result = parseStyles(css, '');
        appendString(result, '');
      });
    }

    return appendValue(value);
  }, '');

  if (!current) return classes.join('\n');
  if (!currentClass) return current;

  const css = `${currentClass} { ${current} }`;
  return [css, ...classes].join('\n');
};
