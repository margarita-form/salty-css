import { parseAndJoinStyles } from '../parsers/parse-styles';
import { StyledParams, Styles } from '../types';
import { CachedConfig, SaltyConfig } from '../types/config-types';
import { dashCase, toHash } from '../util';

export interface StylesGeneratorBuildTimeProps {
  callerName?: string;
  isProduction?: boolean;
  config?: SaltyConfig & CachedConfig;
  classNames?: string[];
}

export class StylesGenerator<const STYLE_PARAMS extends StyledParams = StyledParams> {
  public buildContext: StylesGeneratorBuildTimeProps = {};

  constructor(public params: STYLE_PARAMS) {}

  get priority(): number {
    return 0;
  }

  get isRoot(): boolean {
    return this.priority === 0;
  }

  get hash() {
    const { base, variants, compoundVariants, anyOfVariants } = this.params;
    return toHash({ base, variants, compoundVariants, anyOfVariants });
  }

  get cssClassName() {
    return this.hash;
  }

  get classNames() {
    const classNames = new Set([this.cssClassName]);
    const { className } = this.params;
    if (typeof className == 'string') classNames.add(className);
    if (typeof className == 'object') className.forEach((c) => classNames.add(c));
    this.getTemplateClasses().forEach((c) => classNames.add(c));
    if (this.buildContext.classNames) this.buildContext.classNames.forEach((c) => classNames.add(c));
    return [...classNames].join(' ');
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
    const { base = {}, variants = {}, compoundVariants = [], anyOfVariants = [] } = this.params;
    const { config } = this.buildContext;

    const combinedStyles: Styles = { ...base, variants, compoundVariants, anyOfVariants };
    const css = parseAndJoinStyles(combinedStyles, `.${this.cssClassName}`, config, this.isRoot);
    return css;
  }

  public getTemplateClasses(config = this.buildContext.config) {
    if (!config?.templates || !this.params.base || this.priority > 0) return [];
    const templateKeys = Object.keys(config.templates);
    return Object.entries(this.params.base).reduce((acc, [key, value]) => {
      if (templateKeys.includes(key)) acc.push('t_' + toHash(dashCase(`${key}-${value}`), 4));
      return acc;
    }, [] as string[]);
  }

  public _withBuildContext(context: StylesGeneratorBuildTimeProps) {
    this.buildContext = context;
    return this;
  }
}
