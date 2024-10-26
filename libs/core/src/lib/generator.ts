import { dashCase } from '../util/dash-case';
import { toHash } from '../util/to-hash';

export type Styles = Record<string, unknown>;

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
    const stylesStringArr = Object.entries(this.styles).map(
      ([key, value]) => `${dashCase(key)}: ${value};`
    );
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
