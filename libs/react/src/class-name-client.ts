export const className = (className: string) => {
  const str = new String(className);

  Object.assign(str, {
    get isClassName() {
      return true;
    },
  });

  return str as string & {
    isClassName: boolean;
  };
};
