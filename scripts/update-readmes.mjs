import { getFile, setFile } from './script-helpers.mjs';

const packages = ['core', 'react', 'next', 'cli', 'npm-create', 'eslint-config-core', 'eslint-plugin-core', 'vite', 'webpack'];

const rootPath = '../README.md';
const readmeContents = await getFile(rootPath, false);

await Promise.all(
  packages.map(async (dist) => {
    const path = `../libs/${dist}/README.md`;
    await setFile(path, readmeContents);
  })
);
