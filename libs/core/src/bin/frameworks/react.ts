import { FrameworkAdapter } from './types';

export const reactFramework: FrameworkAdapter = {
  name: 'react',
  srcDirectory: '',
  detect: () => true, // default fallback — evaluated last in the registry
  runtimePackage: (version) => `@salty-css/react@${version}`,
  templates: {
    styled: 'react/styled-file.ts',
    component: {
      styled: 'react/styled-file.ts',
      wrapper: 'react/vanilla-file.ts',
      wrapperExt: '.tsx',
    },
  },
};
