![Bannter](https://raw.githubusercontent.com/gist/tremppu/ef2b867907cbf262ab7373f41558a403/raw/7cc7dc697eb34342dc685d814eff6bc4d62796d2/salty-logo-svg-dvd.svg)

# Salty CSS - Kinda sweet but yet spicy CSS-in-JS library

In the world of frontend dev is there anything saltier than CSS? Salty CSS is built to provide better developer experience for developers looking for performant and feature rich CSS-in-JS solutions.

## Features

- Build time compilation to achieve awesome runtime performance and minimal size
- Next.js, React Server Components, Vite and Webpack support
- Type safety with out of the box TypeScript and ESLint plugin
- Advanced CSS variables configuration to allow smooth token usage
- Style templates to create reusable styles easily

## Get started

- Initialize: `npx salty-css init [directory]`
- Create component: `npx salty-css generate [filePath]`
- Build: `npx salty-css build [directory]`

### Initialize

Fastest way to get started with any framework is [npx salty-css init [directory]](#initialize-salty-css-for-a-project) command

- Next.js → [Next.js guide](#nextjs) + [Next.js example app](https://github.com/margarita-form/salty-css-website)
- React → [React guide](#react) + [React example code](#code-examples)
- Vite → [Vite guide](#vite)
- Webpack → Guide coming soon
- ESLint → Guide coming soon

### Salty CSS CLI

In your existing repository you can use `npx salty-css [command]` to initialize a project, generate components, update related packages and build required files.

- Initialize project → `npx salty-css init [directory]` - Installs required packages, detects framework in use and creates project files to the provided directory. Directory can be left blank if you want files to be created to the current directory.
- Generate component → `npx salty-css update [version]` - Update @salty-css packages in your repository. Default version is "latest". Additional options like `--dir`, `--tag`, `--name` and `--className` are also supported.
- Build files → `npx salty-css build [directory]` - Compile Salty CSS related files in your project. This should not be needed if you are using tools like Next.js or Vite

### Guides

#### Next.js

In your existing Next.js repository you can run `npx salty-css init` to automatically configure Salty CSS.

##### Manual configuration

1. For Next.js support install `npm i @salty-css/next @salty-css/core @salty-css/react`
2. Create `salty.config.ts` to your app directory
3. Add Salty CSS plugin to next.js config

- **Next.js 15:** In `next.config.ts` add import for salty plugin `import { withSaltyCss } from '@salty-css/next';` and then add `withSaltyCss` to wrap your nextConfig export like so `export default withSaltyCss(nextConfig);`
- **Next.js 14 and older:** In `next.config.js` add import for salty plugin `const { withSaltyCss } = require('@salty-css/next');` and then add `withSaltyCss` to wrap your nextConfig export like so `module.exports = withSaltyCss(nextConfig);`

4. Make sure that `salty.config.ts` and `next.config.ts` are in the same folder!
5. Build `saltygen` directory by running your app once or with cli `npx salty-css build [directory]`
6. Import global styles from `saltygen/index.css` to some global css file with `@import 'insert_path_to_index_css';`.

[Check out Next.js demo project](https://github.com/margarita-form/salty-css-website) or [react example code](#code-examples)

#### Vite

In your existing Vite repository you can run `npx salty-css init` to automatically configure Salty CSS.

##### Manual configuration

1. For Vite support install `npm i @salty-css/vite @salty-css/core`
2. In `vite.config` add import for salty plugin `import { saltyPlugin } from '@salty-css/vite';` and then add `saltyPlugin(__dirname)` to your vite configuration plugins
3. Make sure that `salty.config.ts` and `vite.config.ts` are in the same folder!
4. Build `saltygen` directory by running your app once or with cli `npx salty-css build [directory]`
5. Import global styles from `saltygen/index.css` to some global css file with `@import 'insert_path_to_index_css';`.

#### React

In your existing React repository you can run `npx salty-css init` to automatically configure Salty CSS.

##### Manual configuration

1. Install related dependencies: `npm i @salty-css/core @salty-css/react`
2. Create `salty.config.ts` to your app directory
3. Configure your build tool to support Salty CSS ([Vite](#vite) or Webpack) or after changes run `npx salty-css build`

[Check out react example code](#code-examples)

### Create components

1. Create salty components with styled only inside files that end with `.css.ts`, `.salty.ts` `.styled.ts` or `.styles.ts`

## Code examples

### Basic usage example with Button

**Salty config**

```tsx
import { defineConfig } from '@salty-css/core/config';

export const config = defineConfig({
  variables: {
    colors: {
      brand: '#111',
      highlight: 'yellow',
    },
  },
  global: {
    html: {
      backgroundColor: '#f8f8f8',
    },
  },
});
```

**Wrapper** (`components/wrapper/wrapper.css.ts`)

```tsx
import { styled } from '@salty-css/react/styled';

export const Wrapper = styled('div', {
  base: {
    display: 'block',
    padding: '2vw',
  },
});
```

**Button** (`components/button/button.css.ts`)

```tsx
import { styled } from '@salty-css/react/styled';

export const Button = styled('button', {
  base: {
    display: 'block',
    padding: `0.6em 1.2em`,
    border: '1px solid currentColor',
    background: 'transparent',
    color: 'currentColor',
    cursor: 'pointer',
    transition: '200ms',
    textDecoration: 'none',
    '&:hover': {
      background: 'black',
      borderColor: 'black',
      color: 'white',
    },
    '&:disabled': {
      opacity: 0.25,
      pointerEvents: 'none',
    },
  },
  variants: {
    variant: {
      outlined: {
        // same as default styles
      },
      solid: {
        '&:not(:hover)': {
          background: 'black',
          borderColor: 'black',
          color: 'white',
        },
        '&:hover': {
          background: 'transparent',
          borderColor: 'currentColor',
          color: 'currentColor',
        },
      },
    },
  },
});
```

**Your React component file**

```tsx
import { Wrapper } from '../components/wrapper/wrapper.css';
import { Button } from '../components/button/button.css';

export const IndexPage = () => {
  return (
    <Wrapper>
      <Button variant="solid" onClick={() => alert('It is a button.')}>
        Outlined
      </Button>
    </Wrapper>
  );
};
```

More examples coming soon
