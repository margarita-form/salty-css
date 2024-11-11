import { CssStyles } from '../types';

type CssTemplate = CssStyles | { [key: PropertyKey]: CssTemplate };

export interface CssConditionalVariables {
  [key: PropertyKey]: {
    [key: PropertyKey]: CssStyles;
  };
}

export interface CssTemplates {
  [key: PropertyKey]: {
    [key: PropertyKey]: CssTemplate;
  };
}

export interface CssModifier {
  pattern: RegExp;
  transform: (regexMatch: string) => {
    css?: CssStyles;
    value: string;
  };
}

export type CssModifiers = Record<string, CssModifier>;

export interface SaltyConfig {
  /**
   * The import strategy to use when importing css files.
   * - `root` will import the css file from the root of the project.
   * - `component` will import the css file from the component's directory.
   */
  importStrategy: 'root' | 'component';
  /**
   * The variables that can be used in styles.
   */
  variables: Record<string, unknown>;
  /**
   * The conditional variables that can be used in styles.
   */
  conditionalVariables: CssConditionalVariables;
  /**
   * The global styles that are imported in the root of the project.
   */
  global: CssStyles;
  /**
   * The templates that can be used in styles to create reusable css.
   */
  templates: CssTemplates;
  /**
   * The modifiers that can transform css values.
   */
  modifiers: CssModifiers;
}
