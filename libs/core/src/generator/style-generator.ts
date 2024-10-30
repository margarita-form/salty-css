import { GeneratorOptions, Styles, Tag } from '../types';
import { toHash } from '../util/to-hash';
import { getTemplateKeys } from './parse-templates';
import { parseStyles } from './parse-styles';

export class StyleComponentGenerator {
  public _callerName: string | undefined;
  public _context: { name: string; config: any } | undefined;

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

  get templateKeys() {
    return this._context?.config.templates
      ? getTemplateKeys(this._context.config.templates)
      : [];
  }

  get css() {
    return parseStyles(
      this.styles,
      `.${this.cssClassName}`,
      this.priority,
      this._context?.config
    );
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

  public _withBuildContext(context: { name: string; config: any }) {
    this._context = context;
    const { name, config } = context;
    this._callerName = name;
    return this;
  }
}
