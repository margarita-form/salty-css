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

  get cssValues() {
    const stylesStringArr = Object.entries(this.styles).map(([key, value]) => {
      // `${dashCase(key)}: ${value};`
      const propertyName = key.startsWith('-') ? key : dashCase(key);
      if (typeof value !== 'string') return undefined;
      const propertyValue = /\{.+\}/.test(value)
        ? `var(--${dashCase(value.replace(/\{|\}/g, '').replaceAll('.', '-'))})`
        : value;
      return `${propertyName}: ${propertyValue};`;
    });
    return stylesStringArr.join(' ');
  }

  get cssDisplayNameVar() {
    return `--${this.hash}-display-name: ${this._callerName};`;
  }

  get css() {
    if (this._callerName) {
      return `.${this.cssClassName} { 
      ${this.cssDisplayNameVar}${this.cssValues} }`;
    }
    return `.${this.cssClassName} { ${this.cssValues} }`;
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
