import { SaltyVariables } from '../types/config-types';

export class VariablesFactory {
  constructor(public _current: SaltyVariables) {}

  get isDefineVariables() {
    return true;
  }
}

/**
   * Base level variables that can be used in all styles as they are applied globally to :root.
   @param responsive Variables that are defined for different media queries.
   @param conditional Variables that are defined for different parent selectors (classes or data attributes).
   */
export const defineVariables = (variables: SaltyVariables) => {
  return new VariablesFactory(variables);
};
