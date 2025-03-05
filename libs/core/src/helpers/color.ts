/* eslint-disable @typescript-eslint/no-explicit-any */
import colorFunction, { ColorInstance, ColorLike } from 'color';

class Color {
  public isColor = true;
  public currentColor: ColorInstance;

  constructor(base: ColorLike) {
    this.currentColor = colorFunction(base);

    return new Proxy(this, {
      get(target: any, prop: any) {
        if (prop in target) return target[prop];
        if (prop in target.currentColor) return target._handleColorMethod(prop);
        return target[prop];
      },
    });
  }

  public _handleColorMethod(method: keyof ColorInstance) {
    const color = this.currentColor as Record<keyof ColorInstance, any>;
    if (typeof color[method] !== 'function') return color[method];
    return (...args: any[]) => {
      this.currentColor = color[method](...args);
      return this;
    };
  }

  public toString() {
    return this.currentColor.toString();
  }
}

export const color = (value: ColorLike) => {
  return new Color(value) as Color & ColorInstance;
};
