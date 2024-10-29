import type { LoaderContext } from 'webpack';
import { generateFile, minimizeFile } from '@salty-css/core/compiler';

interface SaltyLoaderOptions {
  dir: string;
}

type WebpackLoaderThis = LoaderContext<SaltyLoaderOptions>;

export default async function (this: WebpackLoaderThis) {
  const { dir } = this.getOptions();
  const { resourcePath, hot } = this;
  if (hot) await generateFile(dir, resourcePath);
  return await minimizeFile(dir, resourcePath);
}
