export interface ImportSpecOptions {
  url: string;
  media?: string;
  supports?: string;
}

export type ImportSpec = string | ImportSpecOptions;

export class ImportFactory {
  public _path?: string;

  constructor(public _current: ImportSpec[]) {}

  get isDefineImport() {
    return true;
  }

  public _setPath(path: string) {
    this._path = path;
    return this;
  }
}

export const defineImport = (...specs: ImportSpec[]) => new ImportFactory(specs);
