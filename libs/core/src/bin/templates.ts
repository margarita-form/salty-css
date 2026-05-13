import ejs from 'ejs';

const templateLoaders = {
  'salty.config.ts': () => import('./templates/salty.config.ts__template'),
  'saltygen/index.css': () => import('./templates/index.css__template'),
  'react/styled-file.ts': () => import('./templates/react/styled-file.ts__template'),
  'react/vanilla-file.ts': () => import('./templates/react/vanilla-file.ts__template'),
  'astro/styled-file.ts': () => import('./templates/astro/styled-file.ts__template'),
  'astro/component.astro': () => import('./templates/astro/astro-component.astro__template'),
} as const;

export type TemplateKey = keyof typeof templateLoaders;

export const readTemplate = async <T extends object>(key: TemplateKey, options?: T) => {
  const { default: file } = await templateLoaders[key]();
  const content = ejs.render(file, options);
  return { fileName: key, content };
};
