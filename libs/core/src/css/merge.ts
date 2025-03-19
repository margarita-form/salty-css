/* eslint-disable @typescript-eslint/no-explicit-any */
interface StyleFactory {
  _current: Record<string, any>;
  _children: Record<string, any>;
}

export const mergeObjects = <T = any>(...styles: any[]): T => {
  return styles.flat().reduce((acc, style: any) => {
    if (style?._current) return { ...acc, ...style._current };
    return { ...acc, ...style };
  }, {} as T);
};

export const mergeFactories = <T extends StyleFactory>(...factories: T[][]): T => {
  return factories.flat().reduce((acc, factory: any) => {
    return { ...acc, ...factory._children };
  }, {} as T);
};
