import { GlobalStyles } from '../types/config-types';

export class GlobalStylesFactory {
  constructor(public _current: GlobalStyles) {}

  get isGlobalDefine() {
    return true;
  }
}

export const defineGlobalStyles = (styles: GlobalStyles) => {
  return new GlobalStylesFactory(styles);
};
