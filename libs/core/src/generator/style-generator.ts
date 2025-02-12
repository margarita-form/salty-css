import { StyledParams, Styles, Tag } from '../types';
import { toHash } from '../util/to-hash';
import { getTemplateKeys } from './parse-templates';
import { parseStyles } from './parse-styles';
import { dashCase } from '../util';

export interface GeneratorProps {
  element?: string;
  variantKeys?: string[];
  propValueKeys?: string[];
  passProps?: boolean | string | string[];
  defaultProps?: Record<PropertyKey, unknown>;
  attr: {
    [key: string]: any;
  };
}

export class StyleComponentGenerator {
  public _isProd: boolean | undefined;
  public _callerName: string | undefined;
  public _context: { name: string; config: any } | undefined;

  constructor(public tagName: Tag<any>, public params: StyledParams) {}

  get hash() {
    return toHash(this.params.base || this.params);
  }

  get priority(): number {
    if (typeof this.tagName === 'function' || typeof this.tagName === 'object') {
      const prev = this.tagName.generator?.priority || 0;
      return prev + 1;
    }
    return 0;
  }

  get classNames() {
    const classNames: string[] = [this.hash];
    const { className } = this.params;
    if (className) classNames.push(className);
    return classNames.join(' ');
  }

  get cssClassName() {
    return this.hash;
  }

  get cssDisplayNameVar() {
    return `--${this.hash}-display-name: ${this._callerName};`;
  }

  get cssFileName() {
    if (this._callerName) {
      const dasherized = dashCase(this._callerName);
      return `c_${dasherized}-${this.hash}-${this.priority}.css`;
    }
    return `${this.hash}-${this.priority}.css`;
  }

  get templateKeys() {
    return this._context?.config.templates ? getTemplateKeys(this._context.config.templates) : [];
  }

  get css() {
    const { base = {}, variants = {}, compoundVariants = [] } = this.params;
    const combinedStyles: Styles = { ...base, variants, compoundVariants };
    return parseStyles(combinedStyles, `.${this.cssClassName}`, this.priority, this._context?.config);
  }

  get props(): GeneratorProps {
    const { element, variants = {}, compoundVariants = [], defaultVariants = {}, defaultProps = {}, passProps } = this.params;

    const variantKeys = new Set<string>([]);

    const addVariantKey = (name: string) => {
      const defaultVariant = defaultVariants[name];
      if (defaultVariant !== undefined) variantKeys.add(`${name}=${String(defaultVariant)}`);
      else variantKeys.add(name);
    };

    Object.keys(variants).forEach(addVariantKey);
    compoundVariants.map((cv) => Object.keys(cv).forEach(addVariantKey));

    const propValueKeys = new Set<string>([]);
    const matches = /\{props\.([\w\d]+)\}/gi.exec(JSON.stringify(this.params.base));
    if (matches) {
      matches.forEach((x, y, groups) => {
        const value = groups.at(1);
        if (value) propValueKeys.add(value);
      });
    }

    return {
      element,
      variantKeys: [...variantKeys],
      propValueKeys: [...propValueKeys],
      passProps,
      defaultProps,
      attr: {
        'data-component-name': !this._isProd ? this._callerName : undefined,
      },
    };
  }

  public _withBuildContext(context: { name: string; config: any; prod: boolean }) {
    this._context = context;
    const { name, config, prod } = context;
    this._isProd = prod;
    this._callerName = name;
    return this;
  }
}
