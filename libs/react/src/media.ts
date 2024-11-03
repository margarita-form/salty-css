import { OrNumber, OrString } from '@salty-css/core/types/util-types';

export class MediaQueryFactory {
  constructor(private base = '@media') {}

  private next = (value: string) => {
    const str = new String(value);

    Object.assign(str, {
      get and() {
        return new MediaQueryFactory(`${value} and`);
      },
      get or() {
        return new MediaQueryFactory(`${value},`);
      },
    });

    return str as typeof value & {
      and: MediaQueryFactory;
      or: MediaQueryFactory;
    };
  };

  public custom(value: string) {
    return this.next(`${this.base} ${value}`);
  }

  public minWidth(width: OrString | OrNumber) {
    const _width = typeof width === 'number' ? `${width}px` : width;
    const value = `${this.base} (min-width: ${_width})`;
    return this.next(value);
  }

  public maxWidth(width: OrString | OrNumber) {
    const _width = typeof width === 'number' ? `${width}px` : width;
    const value = `${this.base} (max-width: ${_width})`;
    return this.next(value);
  }

  public minHeight(height: OrString | OrNumber) {
    const _height = typeof height === 'number' ? `${height}px` : height;
    const value = `${this.base} (min-height: ${_height})`;
    return this.next(value);
  }

  public maxHeight(height: OrString | OrNumber) {
    const _height = typeof height === 'number' ? `${height}px` : height;
    const value = `${this.base} (max-height: ${_height})`;
    return this.next(value);
  }

  public get portrait() {
    const value = `${this.base} (orientation: portrait)`;
    return this.next(value);
  }

  public get landscape() {
    const value = `${this.base} (orientation: landscape)`;
    return this.next(value);
  }

  public prefersColorScheme(scheme: 'dark' | 'light' | OrString) {
    const value = `${this.base} (prefers-color-scheme: ${scheme})`;
    return this.next(value);
  }

  public get dark() {
    return this.prefersColorScheme('dark');
  }

  public get light() {
    return this.prefersColorScheme('light');
  }

  public get print() {
    const value = `${this.base} print`;
    return this.next(value);
  }

  public get screen() {
    const value = `${this.base} screen`;
    return this.next(value);
  }

  public get speech() {
    const value = `${this.base} speech`;
    return this.next(value);
  }

  public get all() {
    const value = `${this.base} all`;
    return this.next(value);
  }

  public get not() {
    const value = `${this.base} not`;
    return this.next(value);
  }

  public get reducedMotion() {
    const value = `${this.base} (prefers-reduced-motion: reduce)`;
    return this.next(value);
  }
}

export const media = new MediaQueryFactory();
