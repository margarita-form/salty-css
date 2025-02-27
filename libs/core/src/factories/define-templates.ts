import { CssTemplates } from '../types/config-types';

export interface TemplatesFactoryParams {
  templates?: CssTemplates;
}

export class TemplatesFactory {
  constructor(public _current: TemplatesFactoryParams) {}

  get isDefineTemplates() {
    return true;
  }
}

export const defineTemplates = (templates: CssTemplates) => {
  return new TemplatesFactory(templates);
};
