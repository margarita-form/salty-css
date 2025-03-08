/* eslint-disable @typescript-eslint/no-explicit-any */
import { CssProperties, CssStyles } from '../types';
import { OrString } from '../types/util-types';

export type GlobalStyles = Record<string, CssProperties>;

export type CssVariableTokensObject = Record<string, unknown>;

export interface CssResponsiveVariables {
  [key: string]: CssVariableTokensObject;
}

export interface CssConditionalVariables {
  [key: PropertyKey]: {
    [key: PropertyKey]: CssVariableTokensObject;
  };
}

export interface SaltyVariables {
  responsive?: CssResponsiveVariables;
  conditional?: CssConditionalVariables;
  [key: string]: undefined | string | number | CssVariableTokensObject;
}

type CssTemplate = CssStyles | { [key: PropertyKey]: CssTemplate };

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
   * Base level variables that can be used in all styles as they are applied globally to :root.
   @param responsive Variables that are defined for different media queries.
   @param conditional Variables that are defined for different parent selectors (classes or data attributes).
   */
  variables?: SaltyVariables;

  /**
   * The global styles that are imported in the root of the project.
   */
  reset?: 'default' | 'none' | GlobalStyles;

  /**
   * The global styles that are imported in the root of the project.
   */
  global?: GlobalStyles;

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

  /**
   * default unit for px based properties when providing a number value. Default is 'px'.
   */
  defaultUnit?: 'px' | 'rem' | 'em' | 'vh' | 'vw' | 'vmin' | 'vmax' | 'cm' | 'mm' | 'in' | 'pt' | 'pc' | 'ch' | 'ex' | 'fr' | 'percent' | OrString;
}

// Config file that has only computed, cached values gathered from the Salty config and define function files.
export interface CachedConfig {
  templates: CssTemplates;
  staticVariables: Record<string, any>;
}
