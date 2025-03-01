import { parseStyles } from '../generator/parse-styles';
import { StyledParams, Styles } from '../types';
import { dashCase, toHash } from '../util';

export class ClassNameFactory<const STYLE_PARAMS extends StyledParams = StyledParams> {
  public _isProd: boolean | undefined;
  public _callerName: string | undefined;

  constructor(private params: STYLE_PARAMS) {}

  get hash() {
    return toHash(this.params.base || this.params);
  }

  get cssClassName() {
    return this.hash;
  }

  get classNames() {
    const classNames: string[] = [this.hash];
    const { className } = this.params;
    if (className) classNames.push(className);
    return classNames.join(' ');
  }

  get cssFileName() {
    if (this._callerName) {
      const dasherized = dashCase(this._callerName);
      return `cl_${dasherized}-${this.hash}.css`;
    }
    return `${this.hash}.css`;
  }

  get css() {
    const { base = {}, variants = {}, compoundVariants = [] } = this.params;
    const combinedStyles: Styles = { ...base, variants, compoundVariants };
    const css = parseStyles(combinedStyles, `.${this.cssClassName}`);
    return css;
  }

  public _withBuildContext(context: { name: string; prod: boolean }) {
    const { name, prod } = context;
    this._isProd = prod;
    this._callerName = name;
    return this;
  }
}
