# Salty CSS - Kinda sweet but yet spicy CSS-in-JS library

In the world of frontend dev is there anything saltier than CSS? Salty CSS is built to provide better developer experience for developers looking for performant and feature rich CSS-in-JS solutions.

## Features

- Build time compilation to achieve awesome runtime performance and minimal size
- Next.js, React Server Components, Vite and Webpack support
- Type safety with out of the box TypeScript and ESLint plugin
- Advanced CSS variables configuration to allow smooth token usage
- Style templates to create reusable styles easily

## Get started

### TL;DR

- Initialize: `npx salty-css init [directory]`
- Create component: `npx salty-css generate [filePath]`
- Build: `npx salty-css build [directory]`

### Quick way of using `salty-css` CLI

#### Initialize Salty CSS for a project

In your existing repository run `npx salty-css init [directory]` which installs required salty-css packages to the current directory and creates project files to the provided directory. Directory can be left blank if you want files to be created to the current directory. Init will also create `.saltyrc` which contains some metadata for future CLI commands.

#### Create components

Components can be created with `npx salty-css generate [filePath]` which then creates a new Salty CSS component file to the specified path. Additional options like `--dir, --tag, --name and --className` are also supported. Read more about them with `npx salty-css generate --help`

#### Build / Compile Salty CSS

If you want to manually build your project that can be done by running `npx salty-css build [directory]`. Directory is not required as CLI can use default directory defined in `.saltyrc`. Note that build generates css files but Vite / Webpack plugin is still required for full support.

#### Update Salty CSS packages

To ease the pain of package updates all Salty CSS packages can be updated with `npx salty-css update`

### Manual work

#### React

1. Install related dependencies: `npm i @salty-css/core @salty-css/react`
2. Create `salty.config.ts` to your app directory

#### Vite

1. First check the instructions for React
2. For Vite support install `npm i -D @salty-css/vite`
3. In `vite.config.ts` add import for salty plugin `import { saltyPlugin } from '@salty-css/vite';` and then add `saltyPlugin(__dirname)` to your vite configuration plugins
4. Make sure that `salty.config.ts` and `vite.config.ts` are in the same folder!

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
    color: 'currentColor/40',
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

More examples coming soon
