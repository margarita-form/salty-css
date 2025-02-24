import { CssConditionalVariables, CssResponsiveVariables, CssVariables, GlobalStyles } from '../types/config-types';

export interface VariablesFactoryParams {
  variables?: CssVariables;
  responsiveVariables?: CssResponsiveVariables;
  conditionalVariables?: CssConditionalVariables;
}

export class VariablesFactory {
  constructor(public _current: VariablesFactoryParams) {}

  get isDefineVariables() {
    return true;
  }
}

export const defineVariables = (variables: GlobalStyles) => {
  return new VariablesFactory(variables);
};

export const defineStaticVariables = (variables: CssVariables) => {
  return new VariablesFactory({ variables });
};

export const defineResponsiveVariables = (responsiveVariables: CssResponsiveVariables) => {
  return new VariablesFactory({ responsiveVariables });
};

export const defineConditionalVariables = (conditionalVariables: CssConditionalVariables) => {
  return new VariablesFactory({ conditionalVariables });
};
