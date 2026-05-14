import type { LoaderContext } from 'webpack';
import { SaltyCompiler, SaltyCompilerMode } from '@salty-css/core/compiler/salty-compiler';

interface SaltyLoaderOptions {
  dir: string;
  mode?: SaltyCompilerMode;
}

type WebpackLoaderThis = LoaderContext<SaltyLoaderOptions>;

type SaltyFileTransform = (compiler: SaltyCompiler, file: string) => Promise<string | undefined>;

const compilerCache = new WeakMap<SaltyCompiler, Promise<SaltyFileTransform>>();
const dirCompilerCache = new Map<string, SaltyCompiler>();

const loadFrameworkTransform = async (framework: string | undefined): Promise<SaltyFileTransform> => {
  if (framework === 'react' || framework === undefined) {
    const mod = await import('@salty-css/react/transform-salty-file');
    return mod.transformSaltyFile;
  }

  throw new Error(`@salty-css/webpack: framework "${framework}" is not supported. Supported: react.`);
};

const getCompiler = (dir: string, mode?: SaltyCompilerMode) => {
  const cacheKey = `${dir}|${mode ?? ''}`;
  let compiler = dirCompilerCache.get(cacheKey);
  if (!compiler) {
    compiler = new SaltyCompiler(dir, { mode });
    dirCompilerCache.set(cacheKey, compiler);
  }
  return compiler;
};

const getTransform = (compiler: SaltyCompiler) => {
  let cached = compilerCache.get(compiler);
  if (!cached) {
    cached = compiler.getFramework().then(loadFrameworkTransform);
    compilerCache.set(compiler, cached);
  }
  return cached;
};

export default async function (this: WebpackLoaderThis) {
  const { dir, mode } = this.getOptions();
  const { resourcePath } = this;
  const saltyCompiler = getCompiler(dir, mode);
  await saltyCompiler.generateFile(resourcePath);
  const transform = await getTransform(saltyCompiler);
  return await transform(saltyCompiler, resourcePath);
}
