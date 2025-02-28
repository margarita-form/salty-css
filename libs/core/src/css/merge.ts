/* eslint-disable @typescript-eslint/no-explicit-any */
import { CSSinJS } from '../types';

interface StyleFactory {
  _current: Record<string, any>;
}

export const mergeStyles = <T extends StyleFactory | CSSinJS>(...styles: T[]): T => {
  return styles.flat().reduce((acc, style: any) => {
    if (style?._current) return { ...acc, ...style._current };
    return { ...acc, ...style };
  }, {} as T);
};
