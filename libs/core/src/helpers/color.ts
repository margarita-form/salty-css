/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CachedConfig } from '../config';
import colorFunction, { ColorInstance, ColorLike } from 'color';

declare global {
  const saltyConfig: CachedConfig;
}

type BaseColor = Omit<ColorLike, string> | PropertyValueToken;

class Color {
  public isColor = true;
  public currentColor: ColorInstance;

  constructor(public base: BaseColor) {
    const colorValue = this._resolveBaseColor(base);
    this.currentColor = colorFunction(colorValue);
    return this._createProxy();
  }

  private _createProxy() {
    return new Proxy(this, {
      get(target: any, prop: any) {
        if (prop in target) return target[prop];
        if (prop in target.currentColor) return target._handleColorMethod(prop);
        return target[prop];
      },
    });
  }

  private _resolveBaseColor(base: BaseColor) {
    if (typeof base !== 'string') return base;
    const isToken = /\{[^{}]+\}/g.test(base);
    if (!isToken) return base;

    if (typeof saltyConfig === 'undefined') return 'transparent';

    const { staticVariables } = saltyConfig;
    if (!staticVariables) return 'transparent';

    const tokenPath = base.replace(/^\{|\}$/g, '').split('.');
    const value = tokenPath.reduce((acc, key) => acc[key], staticVariables);
    return value;
  }

  public _handleColorMethod(method: keyof ColorInstance) {
    const color = this.currentColor as Record<keyof ColorInstance, any>;
    if (typeof color[method] !== 'function') return color[method];
    return (...args: any[]) => {
      this.currentColor = color[method](...args);
      return this._createProxy();
    };
  }

  public toString() {
    return this.currentColor.toString();
  }
}

/**
 * Token references must point to a **static** variable that resolves to a real
 * CSS color value (e.g. a hex code or named color). Conditional tokens
 * (`{theme.*}`) and responsive tokens are not in `staticVariables` and will
 * resolve to `transparent`. `color()` cannot be used inside `defineVariables`.
 */
export const color = (value: BaseColor) => {
  return new Color(value) as Color & ColorInstance;
};
