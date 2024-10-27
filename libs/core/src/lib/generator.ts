import { dashCase } from '../util/dash-case';
import { toHash } from '../util/to-hash';

type StylePropertyValue = Record<never, never> & unknown;

export type Styles = Record<string, StylePropertyValue | VariableToken>;

export interface GeneratorOptions {
  className?: string;
  displayName?: string;
  element?: string;
}

export class StyleComponentGenerator {
  public _callerName: string | undefined;

  constructor(public styles: Styles, private options: GeneratorOptions) {}

  get hash() {
    return toHash(this.styles);
  }

  get classNames() {
    const classNames: string[] = [this.hash];
    // if (this._callerName) classNames.push(this._callerName);

    const { className } = this.options;
    if (className) classNames.push(className);
    return classNames.join(' ');
  }

  get cssClassName() {
    return this.hash;
  }

  get cssDisplayNameVar() {
    return `--${this.hash}-display-name: ${this._callerName};`;
  }

  get css() {
    const parseStyles = <T extends object>(
      obj: T,
      currentClass = `.${this.cssClassName}`
    ) => {
      const classes: string[] = [];
      const current = Object.entries(obj).reduce((acc, [key, value]) => {
        if (typeof value === 'object') {
          const _key = key.trim();

          if (_key.startsWith('@')) {
            const result = parseStyles(value, currentClass);
            const query = `${_key} {\n ${result.replace('\n', '\n ')}\n}`;
            classes.push(query);
            return acc;
          }

          const scope = key.includes('&')
            ? _key.replace('&', currentClass)
            : _key.startsWith(':')
            ? `${currentClass}${_key}`
            : `${currentClass} ${_key}`;

          const result = parseStyles(value, scope);
          classes.push(result);
          return acc;
        }

        const propertyName = key.startsWith('-') ? key : dashCase(key);
        const addValue = (val: unknown) => `${acc}${propertyName}: ${val};`;

        if (typeof value === 'number') return addValue(value);
        if (typeof value !== 'string') return acc;

        const isToken = /\{.+\}/.test(value);
        if (isToken) {
          const variable = dashCase(
            value.replace(/\{|\}/g, '').replaceAll('.', '-')
          );

          return addValue(`var(--${variable})`);
        }

        return addValue(value);
      }, '');

      const css = `${currentClass} { ${current} }`;
      return [css, ...classes].join('\n');
    };

    return parseStyles(this.styles);
  }

  get props() {
    const { element } = this.options;
    return {
      element,
    };
  }

  public _withCallerName(name: string) {
    this._callerName = name;
    return this;
  }
}
