/* eslint-disable @typescript-eslint/no-explicit-any */
import colorFunction, { ColorInstance, ColorLike } from 'color';

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
    throw new Error('Token values are not yet supported, use a color string instead');
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

export const color = (value: BaseColor) => {
  return new Color(value) as Color & ColorInstance;
};
