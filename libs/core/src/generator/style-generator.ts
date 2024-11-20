import { StyledParams, Styles, Tag } from '../types';
import { toHash } from '../util/to-hash';
import { getTemplateKeys } from './parse-templates';
import { parseStyles } from './parse-styles';

export interface GeneratorProps {
  element?: string;
  variantKeys?: string[];
  propValueKeys?: string[];
}

export class StyleComponentGenerator {
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

  get templateKeys() {
    return this._context?.config.templates ? getTemplateKeys(this._context.config.templates) : [];
  }

  get css() {
    const { base = {}, variants = {}, compoundVariants = [] } = this.params;
    const combinedStyles: Styles = { ...base, variants, compoundVariants };
    return parseStyles(combinedStyles, `.${this.cssClassName}`, this.priority, this._context?.config);
  }

  get props(): GeneratorProps {
    const { element } = this.params;

    const variantKeys = this.params.variants
      ? Object.keys(this.params.variants).map((name) => {
          const defaultVariant = this.params.defaultVariants?.[name];
          if (defaultVariant !== undefined) return `${name}=${String(defaultVariant)}`;
          return name;
        })
      : undefined;

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
      variantKeys,
      propValueKeys: [...propValueKeys],
    };
  }

  public _withBuildContext(context: { name: string; config: any }) {
    this._context = context;
    const { name, config } = context;
    this._callerName = name;
    return this;
  }
}
