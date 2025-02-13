![Salty CSS Banner](https://raw.githubusercontent.com/gist/tremppu/ef2b867907cbf262ab7373f41558a403/raw/a2137de136ee2296e386682beb4487bba0f58a2f/salty-logo-svg-dvd.svg)

# Salty CSS - CSS-in-JS library that is kinda sweet

Is there anything saltier than CSS in frontend web development? Salty CSS is built to provide better developer experience for developers looking for performant and feature rich CSS-in-JS solutions.

## Features

- Build time compilation to achieve awesome runtime performance and minimal size
- Next.js, React Server Components, Vite and Webpack support
- Type safety with out of the box TypeScript and ESLint plugin
- Advanced CSS variables configuration to allow smooth token usage
- Style templates to create reusable styles easily

## Get started

Fastest way to get started with any framework is `npx salty-css init [directory]` command

- Next.js → [Next.js guide](#nextjs) + [Next.js example app](https://github.com/margarita-form/salty-css-website)
- React + Vite → [React + Vite guide](#react--vite) + [React example code](#code-examples)
- React + Webpack → Guide coming soon

## Useful commands

- Create component: `npx salty-css generate [filePath]`
- Build: `npx salty-css build [directory]`
- Update Salty CSS packages: `npx salty-css up`

## Salty CSS styled function

```ts
// components/wrapper.css.ts
import { styled } from '@salty-css/react/styled';

// Define a component with styled function. First argument is the component name or existing component to extend and second argument is the object containing the styles and other options
export const Component = styled('div', {
  className: 'wrapper', // Define custom class name that will be included for this component
  element: 'section', // Define the html element that will be rendered for this component, overrides the first 'div' argument
  base: {
    // 👉 Add your CSS-in-JS base styles here! 👈
  },
  variants: {
    // Define conditional styles that will be applied to the component based on the variant prop values
  },
  compoundVariants: [
    // Define conditional styles that will be applied to the component based on the combination of variant prop values
  ],
  defaultVariants: {
    // Set default variant prop values
  },
  defaultProps: {
    // Add additional default props for the component (eg, id and other html element attributes)
  },
  passProps: true, // Pass variant props to the rendered element / parent component (default: false)
});
```

## Salty CSS CLI

In your existing repository you can use `npx salty-css [command]` to initialize a project, generate components, update related packages and build required files.

- Initialize project → `npx salty-css init [directory]` - Installs required packages, detects framework in use and creates project files to the provided directory. Directory can be left blank if you want files to be created to the current directory.
- Generate component → `npx salty-css update [version]` - Update @salty-css packages in your repository. Default version is "latest". Additional options like `--dir`, `--tag`, `--name` and `--className` are also supported.
- Build files → `npx salty-css build [directory]` - Compile Salty CSS related files in your project. This should not be needed if you are using tools like Next.js or Vite

## Usage

### Next.js

![salty-next](https://github.com/user-attachments/assets/2cf6a93f-cdd5-4f5f-ab2e-3bc8bcfb83e8)

Salty CSS provides Next.js App & Pages router support with full React Server Components support.

### Add Salty CSS to Next.js

1. In your existing Next.js repository you can run `npx salty-css init` to automatically configure Salty CSS.
2. Create your first Salty CSS component with `npx salty-css generate [filePath]` (e.g. src/custom-wrapper)
3. Import your component for example to `page.tsx` and see it working!

And note: steps 2 & 3 are just to show how get new components up and running, step 1 does all of the important stuff 🤯

#### Manual configuration

1. For Next.js support install `npm i @salty-css/next @salty-css/core @salty-css/react`
2. Create `salty.config.ts` to your app directory
3. Add Salty CSS plugin to next.js config

- **Next.js 15:** In `next.config.ts` add import for salty plugin `import { withSaltyCss } from '@salty-css/next';` and then add `withSaltyCss` to wrap your nextConfig export like so `export default withSaltyCss(nextConfig);`
- **Next.js 14 and older:** In `next.config.js` add import for salty plugin `const { withSaltyCss } = require('@salty-css/next');` and then add `withSaltyCss` to wrap your nextConfig export like so `module.exports = withSaltyCss(nextConfig);`

4. Make sure that `salty.config.ts` and `next.config.ts` are in the same folder!
5. Build `saltygen` directory by running your app once or with cli `npx salty-css build [directory]`
6. Import global styles from `saltygen/index.css` to some global css file with `@import 'insert_path_to_index_css';`.

[Check out Next.js demo project](https://github.com/margarita-form/salty-css-website) or [react example code](#code-examples)

---

### React + Vite

![salty-vite-react](https://github.com/user-attachments/assets/12ec5b6a-0dcc-48fa-afc1-d337fc8f800c)

### Add Salty CSS to your React + Vite app

1. In your existing Vite repository you can run `npx salty-css init` to automatically configure Salty CSS.
2. Create your first Salty CSS component with `npx salty-css generate [filePath]` (e.g. src/custom-wrapper)
3. Import your component for example to `main.tsx` and see it working!

And note: steps 2 & 3 are just to show how get new components up and running, step 1 does all of the important stuff 🤯

#### Manual configuration

1. For Vite support install `npm i @salty-css/vite @salty-css/core`
2. In `vite.config` add import for salty plugin `import { saltyPlugin } from '@salty-css/vite';` and then add `saltyPlugin(__dirname)` to your vite configuration plugins
3. Make sure that `salty.config.ts` and `vite.config.ts` are in the same folder!
4. Build `saltygen` directory by running your app once or with cli `npx salty-css build [directory]`
5. Import global styles from `saltygen/index.css` to some global css file with `@import 'insert_path_to_index_css';`.

[Check out react example code](#code-examples)

---

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
