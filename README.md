![Salty CSS Banner](https://salty-css.dev/assets/banners/dvd.svg)

# Salty CSS - CSS-in-JS library that is kinda sweet

Is there anything saltier than CSS in frontend web development? Salty CSS is built to provide better developer experience for developers looking for performant and feature rich CSS-in-JS solutions.

[Get started](#get-started) | [API](#api) | [Website](https://salty-css.dev/) | [GitHub](https://github.com/margarita-form/salty-css) | [NPM](https://www.npmjs.com/package/@salty-css/core)

## Features

- Build time compilation to achieve awesome runtime performance and minimal size
- Next.js, React Server Components, Astro, Vite and Webpack support
- Type safety with out of the box TypeScript and ESLint plugin
- Advanced CSS variables configuration to allow smooth token usage
- Style templates to create reusable styles easily

## Get started

Fastest way to get started with any framework is

```bash
npx salty-css init [directory]
```

Other guides:

- Next.js → [Next.js guide](#nextjs) + [Next.js example app](https://github.com/margarita-form/salty-css-website)
- React + Vite → [React + Vite guide](#react--vite) + [React example code](#code-examples)
- React + Webpack → Guide coming soon

## Useful commands

- Create component: `npx salty-css generate [filePath]`
- Build: `npx salty-css build [directory]`
- Update Salty CSS packages: `npx salty-css up`

## Good to know

1. All Salty CSS functions (`styled`, `classNames`, `keyframes`, etc.) must be created in `*.css.ts` or `*.css.tsx` files. This is to ensure best build performance.
2. Salty CSS components created with styled function can extend non Salty CSS components (`export const CustomLink = styled(NextJSLink, { ... });`) but those components must take in `className` prop for styles to apply.
3. Among common types like `string` and `number`, CSS-in-JS properties in Salty CSS do support `functions` and `promises` as values (`styled('span', { base: { color: async () => 'red' } });`) but running asynchronous tasks or importing heavy 3rd party libraries into `*.css.ts` or `*.css.tsx` files can cause longer build times.

## API

### Component styling

- [styled](#styled-function) (react only) - create React components that can be used anywhere easily
- [className](#class-name-function) (framework agnostic) - create a CSS class string that can be applied to any element

### Global styling

- [defineGlobalStyles](#global-styles) - set global styles like `html` and `body`
- [defineVariables](#variables) - create CSS variables (tokens) that can be used in any styling function
- [defineMediaQuery](#media-queries) - create CSS media queries and use them in any styling function
- [defineTemplates](#templates) - create reusable templates that can be applied when same styles are used over and over again
- [keyframes](#keyframes-animations) - create CSS keyframes animation that can be used and imported in any styling function

### Styling helpers & utility

- [defineViewportClamp](#viewport-clamp) - create CSS clamp functions that are based on user's viewport and can calculate relative values easily
- [color](#color-function) - transform any valid color code or variable to be darker, lighter etc. easily (uses [color library by Qix-](https://github.com/Qix-/color))

## Styled function

Styled function is the main way to use Salty CSS within React. Styled function creates a React component that then can be used anywhere in your app. All styled functions must be created in `.css.ts` or `.css.tsx` files

```ts
// /components/my-component.css.ts
import { styled } from '@salty-css/react/styled';

// Define a component with a styled function. First argument is the component name or existing component to extend and second argument is the object containing the styles and other options
export const Component = styled('div', {
  className: 'wrapper', // Define optional custom class name that will be included for this component
  element: 'section', // Override the html element that will be rendered for this component
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

Example usage:

```tsx
import { Component } from './my-component.css';

export const Page = () => {
  return <Component>Hello world</Component>;
};
```

## Class name function

Create CSS class names with possibility to add scope and media queries etc. Function `className` is quite similar to `styled` but does not allow extending components or classes.

```ts
// /components/my-class.css.ts
import { className } from '@salty-css/react/class-name';

// Define a CSS class with className function. First and only argument is the object containing the styles and other options
export const myClass = className({
  className: 'wrapper', // Define optional custom class name that will be included to the scope
  base: {
    // 👉 Add your CSS-in-JS base styles here! 👈
  },
});
```

Example usage:

```tsx
import { myClass } from './my-class.css';

export const Page = () => {
  return <div className={myClass}>Hello world</div>;
};
```

## Global styles

```ts
// /styles/global.css.ts
import { defineGlobalStyles } from '@salty-css/core/factories';

export default defineGlobalStyles({
  html: {
    fontFamily: 'Arial, sans-serif',
  },
  body: {
    backgroundColor: '#fff',
    margin: 0,
  },
  // Add more global styles as needed
});
```

## Variables

```ts
// /styles/variables.css.ts
import { defineVariables } from '@salty-css/core/factories';

export default defineVariables({
  /*
  Define static variable token (like colors, font sizes, etc.). and use them in your styles (e.g. color: '{colors.brand.highlight}').
  Variables can be nested (colors.brand.main) and can reference other variables.
  */
  colors: {
    dark: '#111',
    light: '#fefefe',
    brand: {
      main: '#0070f3',
      highlight: '#ff4081',
    },
  },
  fontFamily: {
    heading: 'Arial, sans-serif',
    body: 'Georgia, serif',
  },

  /* 
  Define variables that are responsive to a media query (defined in media.css.ts) asn use them in your styles as normal (e.g. font-size: '{fontSize.heading.regular}').
  These variables will be automatically updated when the media query is matched. Base values are used when no media query is matched.
  */
  responsive: {
    base: {
      fontSize: {
        heading: {
          small: '32px',
          regular: '48px',
          large: '64px',
        },
        body: {
          small: '16px',
          regular: '20px',
          large: '24px',
        },
      },
    },
    '@largeMobileDown': {
      fontSize: {
        heading: {
          small: '20px',
          regular: '32px',
          large: '48px',
        },
        body: {
          small: '14px',
          regular: '16px',
          large: '20px',
        },
      },
    },
  },

  /* 
  Conditional variables are used to define styles that depend on a class name (e.g. <div className="theme-dark">). or data-attribute (e.g. <div data-theme="dark">). Names for these variables will be "{theme.backgroundColor}" and "{theme.textColor}".
  */
  conditional: {
    theme: {
      dark: {
        backgroundColor: '{colors.dark}',
        textColor: '{colors.light}',
      },
      light: {
        backgroundColor: '{colors.light}',
        textColor: '{colors.dark}',
      },
    },
  },
});
```

Example usage:

```ts
styled('span', {
  base: {
    // Use of static font family variable
    fontFamily: '{colors.fontFamily.heading}',
    // Use of responsive font size variable
    fontSize: '{fontSize.heading.regular}',
    // Use of conditional theme text color variable
    color: '{theme.textColor}',
  },
});
```

## Media queries

Create global media queries that can be either used directly as a scope (e.g. `'@MEDIA_QUERY_NAME': { color: 'blue' }`) or imported to be used in JS.

```ts
// /styles/media.css.ts
import { defineMediaQuery } from '@salty-css/react/config';

export const largePortraitUp = defineMediaQuery((media) => media.minWidth(600));
export const largeMobileDown = defineMediaQuery((media) => media.maxWidth(600));
```

Example usage:

```ts
styled('span', { base: { fontSize: '64px', '@largeMobileDown': { fontSize: '32px' } } });
```

## Templates

With templates you can create reusable styles that can be used in any styles function. Templates can be static (all values defined in the template) or functions (parameters can be passed to define values). Templates can be used in styles by using template's name (e.g. textStyle) as property name and for static a key as the value for functions any supported parameter value can be used as the value.

```ts
// /styles/templates.css.ts
import { defineTemplates } from '@salty-css/core/factories';

export default defineTemplates({
  // Static templates for text styles.
  textStyle: {
    headline: {
      small: {
        fontSize: '{fontSize.heading.small}',
      },
      regular: {
        fontSize: '{fontSize.heading.regular}',
      },
      large: {
        fontSize: '{fontSize.heading.large}',
      },
    },
    body: {
      small: {
        fontSize: '{fontSize.body.small}',
        lineHeight: '1.5em',
      },
      regular: {
        fontSize: '{fontSize.body.regular}',
        lineHeight: '1.33em',
      },
    },
  },
  // Dynamic function templates for card styles.
  card: (value: string) => {
    return {
      padding: value,
      borderRadius: '8px',
      boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
    };
  },
});
```

Example usage:

```ts
styled('div', { base: { textStyle: 'headline.large', card: '20px' } });
```

## Keyframes animations

```ts
// /styles/animations.css.ts
import { keyframes } from '@salty-css/react/keyframes';

export const fadeIn = keyframes({
  // Name of the animation in final CSS
  animationName: 'fadeIn',
  // Add `from` or `0%` to the component's css making it the initial state.
  appendInitialStyles: true,
  // CSS animation default params used with the value
  params: {
    delay: '250ms',
    fillMode: 'forwards',
  },
  // Rest is animation timeline
  from: {
    opacity: 0,
  },
  to: {
    opacity: 1,
  },
});
```

Example usage:

```ts
import { fadeIn } from 'path-to-animations.css.ts';

export const Wrapper = styled('div', { base: { animation: fadeIn } });
```

## Viewport clamp

Create a CSS clamp function based on screen sizes. Useful when aiming to create font sizes or spacings that scale with the screen.

```ts
// /styles/clamp.css.ts
import { defineViewportClamp } from '@salty-css/react/helpers';

export const fhdClamp = defineViewportClamp({ screenSize: 1920 });
export const mobileClamp = defineViewportClamp({ screenSize: 640 });
```

Example usage:

```ts
styled('span', { base: { fontSize: fhdClamp(96), '@largeMobileDown': { fontSize: mobileClamp(48) } } });
```

## Color function

Modify any color easily, add opacity, darken...

Example usage:

```ts
import { color } from '@salty-css/core/helpers';

export const Wrapper = styled('span', { base: { backgroundColor: color('#000').alpha(0.5) } });
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
