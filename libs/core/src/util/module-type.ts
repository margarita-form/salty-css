// Detect the current module type (esmodule or commonjs) based on file extension
export const detectCurrentModuleType = () => {
  if (import.meta.url.endsWith('.cjs')) {
    return 'cjs';
  }
  return 'esm';
};
