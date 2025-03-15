import { parseAndJoinStyles } from '../parsers/parse-styles';
import { StyledParams, Styles } from '../types';
import { SaltyConfig } from '../types/config-types';
import { dashCase, toHash } from '../util';

export interface StylesGeneratorBuildTimeProps {
  callerName?: string;
  isProduction?: boolean;
  config?: SaltyConfig;
}

export class StylesGenerator<const STYLE_PARAMS extends StyledParams = StyledParams> {
  public buildContext: StylesGeneratorBuildTimeProps = {};

  constructor(public params: STYLE_PARAMS) {}

  get hash() {
    return toHash(this.params.base || this.params);
  }

  get cssClassName() {
    return this.hash;
  }

  get classNames() {
    const classNames: string[] = [this.hash];
    const { className } = this.params;
    if (typeof className == 'string') classNames.push(className);
    if (typeof className == 'object') classNames.push(...className);
    return classNames.join(' ');
  }

  get cssFileName() {
    const { callerName } = this.buildContext;
    if (callerName) {
      const dasherized = dashCase(callerName);
      return `cl_${dasherized}-${this.hash}.css`;
    }
    return `${this.hash}.css`;
  }

  get css() {
    const { base = {}, variants = {}, compoundVariants = [] } = this.params;
    const { config } = this.buildContext;

    const combinedStyles: Styles = { ...base, variants, compoundVariants };

    const css = parseAndJoinStyles(combinedStyles, `.${this.cssClassName}`, config);
    if (compoundVariants?.length) css.then((styles) => console.log({ combinedStyles, styles }));

    return css;
  }

  public _withBuildContext(context: StylesGeneratorBuildTimeProps) {
    this.buildContext = context;
    return this;
  }
}
