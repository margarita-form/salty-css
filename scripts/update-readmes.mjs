import { getFile, setFile } from './script-helpers.mjs';

const packages = ['core', 'react', 'next', 'cli', 'eslint-plugin-core', 'vite', 'webpack'];

const rootPath = '../README.md';
const corePath = '../dist/libs/margarita-form/README.md';
const reactPath = '../dist/libs/margarita-form-react/README.md';
const angularPath = '../dist/libs/margarita-form-angular/README.md';
const readmeContents = await getFile(rootPath, false);
const libsToUpdate = [corePath, reactPath, angularPath];

await Promise.all(
  packages.map(async (dist) => {
    const path = `../libs/${dist}/README.md`;
    await setFile(path, readmeContents);
  })
);
