import { dashCase } from '../util/dash-case';
import { toHash } from '../util/to-hash';

export type Styles = Record<string, unknown>;

export interface GeneratorOptions {
  className?: string;
  displayName?: string;
}

export class StyleComponentGenerator {
  private _callerName: string | undefined;

  constructor(
    public tagName: string,
    public styles: Styles,
    private options: GeneratorOptions
  ) {
    //
  }

  get hash() {
    return toHash(this.styles);
  }

  get className() {
    const classNames: string[] = [];
    if (this._callerName) classNames.push(`${this._callerName}__${this.hash}`);
    else classNames.push(this.hash);

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

  get css() {
    return `.${this.cssClassName} { ${this.cssValues} }`;
  }

  public _withCallerName(name: string) {
    this._callerName = name;
    return this;
  }
}
