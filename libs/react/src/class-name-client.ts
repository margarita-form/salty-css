interface ClassNameMethods {
  isClassName: boolean;
  variant: (name: string, value: string) => string & ClassNameFunction;
}

type ClassNameFunction = string & ClassNameMethods;

export const className = (classNameStr: string) => {
  const str = new String(classNameStr);

  Object.assign(str, {
    get isClassName() {
      return true;
    },
    variant: (name: string, value: string) => {
      const variantClass = `${name}-${value}`;
      const combinedClass = `${classNameStr} ${variantClass}`;
      return className(combinedClass);
    },
  });

  return str as ClassNameFunction;
};
