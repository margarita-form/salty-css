import { CssTemplateFunction, CssTemplateObject, CssTemplates } from '../types/config-types';

export interface TemplateFactoryParams {
  name: string;
  template: CssTemplateObject | CssTemplateFunction;
}

export class TemplateFactory {
  public _path?: string;
  constructor(public params: TemplateFactoryParams) {}

  get _current(): CssTemplateObject | CssTemplateFunction {
    return this.params.template;
  }

  get isDefineTemplate() {
    return true;
  }

  public _setPath(path: string) {
    this._path = path;
    return this;
  }
}

export type TemplatesFactoryParams = CssTemplates;

export class TemplatesFactory {
  public _path?: string;
  private templates: TemplateFactory[] = [];

  constructor(public params: TemplatesFactoryParams) {
    Object.entries(params).forEach(([name, template]) => {
      this.templates.push(
        new TemplateFactory({
          name,
          template,
        })
      );
    });
  }

  get _current(): CssTemplates {
    return this.params;
  }

  get _children() {
    return Object.fromEntries(
      this.templates.map((template) => {
        return [template.params.name, template];
      })
    );
  }

  get isDefineTemplates() {
    return true;
  }

  public _setPath(path: string) {
    this._path = path;
    this.templates.forEach((template) => template._setPath(path));
    return this;
  }
}

export const defineTemplates = (templates: TemplatesFactoryParams) => {
  return new TemplatesFactory(templates);
};
