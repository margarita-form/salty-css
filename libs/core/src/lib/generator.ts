import { Tag } from '../react/element-builder';
import { dashCase } from '../util/dash-case';
import { toHash } from '../util/to-hash';

type CompoundVariant = { [key: PropertyKey]: any; css: Styles };

type Variants = {
  variants?: { [key: PropertyKey]: { [key: PropertyKey]: Styles } };
  defaultVariants?: { [key: PropertyKey]: any };
  compoundVariants?: CompoundVariant[];
};

type StylePropertyValue = Record<never, never> & unknown;

interface CssStyles {
  [key: string]: StylePropertyValue | PropertyValueToken | CssStyles;
}

export type Styles = CssStyles & Variants;

export interface GeneratorOptions {
  className?: string;
  displayName?: string;
  element?: string;
}

export class StyleComponentGenerator {
  public _callerName: string | undefined;

  constructor(
    public tagName: Tag<any>,
    public styles: Styles,
    private options: GeneratorOptions
  ) {}

  get hash() {
    return toHash(this.styles);
  }

  get priority(): number {
    if (typeof this.tagName === 'function') {
      const prev = this.tagName.generator?.priority || 0;
      return prev + 1;
    }
    return 0;
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
          if (!value) return acc;
          const _key = key.trim();

          if (_key === 'variants') {
            Object.entries<any>(value).forEach(([prop, conditions]) => {
              if (!conditions) return;
              Object.entries<any>(conditions).forEach(([val, styles]) => {
                if (!styles) return;
                const scope = `${currentClass}.${prop}-${val}`;
                const result = parseStyles(styles, scope);
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
              const result = parseStyles(css, scope);
              classes.push(result);
            });
            return acc;
          }

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

      const css = `@layer l${this.priority} { ${currentClass} { ${current} } }`;
      return [css, ...classes].join('\n');
    };

    return parseStyles(this.styles);
  }

  get props() {
    const { element } = this.options;

    const variantKeys = this.styles.variants
      ? Object.keys(this.styles.variants).map((name) => {
          const defaultVariant = this.styles.defaultVariants?.[name];
          if (defaultVariant) return `${name}=${String(defaultVariant)}`;
          return name;
        })
      : undefined;

    return {
      element,
      variantKeys,
    };
  }

  public _withCallerName(name: string) {
    this._callerName = name;
    return this;
  }
}
