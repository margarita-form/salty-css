import type { LoaderContext } from 'webpack';
import { SaltyCompiler } from '@salty-css/core/compiler/as-class';

interface SaltyLoaderOptions {
  dir: string;
}

type WebpackLoaderThis = LoaderContext<SaltyLoaderOptions>;

export default async function (this: WebpackLoaderThis) {
  const { dir } = this.getOptions();
  const { resourcePath } = this;
  const saltyCompiler = new SaltyCompiler(dir);
  await saltyCompiler.generateFile(resourcePath);
  return await saltyCompiler.minimizeFile(resourcePath);
}
