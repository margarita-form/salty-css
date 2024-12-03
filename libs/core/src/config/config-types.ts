import { CssStyles } from '../types';
import { OrString } from '../types/util-types';

type CssTemplate = CssStyles | { [key: PropertyKey]: CssTemplate };

export type CssVariables = Record<string, unknown>;

export interface CssResponsiveVariables {
  [key: string]: CssVariables;
}

export interface CssConditionalVariables {
  [key: PropertyKey]: {
    [key: PropertyKey]: CssVariables;
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
  importStrategy?: 'root' | 'component';
  /**
   * Base variables that can be used in all styles as they are applied globally to :root.
   */
  variables?: CssVariables;
  /**
   * Variables that are defined for different media queries.
   */
  responsiveVariables?: CssResponsiveVariables;
  /**
   * Variables that are defined for different parent selectors (classes or data attributes).
   */
  conditionalVariables?: CssConditionalVariables;
  /**
   * The global styles that are imported in the root of the project.
   */
  global?: CssStyles;
  /**
   * The templates that can be used in styles to create reusable css.
   */
  templates?: CssTemplates;
  /**
   * The modifiers that can transform css values.
   */
  modifiers?: CssModifiers;
  /**
   * Define modules that should not be bundled when generating the css file. This improves the performance of the css generation and can help with issues relared to external packages being imported in an environment that does not support them.
   */
  externalModules?: ('react' | 'react-dom' | OrString)[];
}
