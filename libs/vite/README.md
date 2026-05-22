![Salty CSS Banner](https://salty-css.dev/assets/banners/dvd.svg)

# Salty CSS — CSS-in-JS that compiles away

Salty CSS is a build-time, type-safe CSS-in-JS library. You author styles in `.css.ts` files; the compiler emits real CSS, your runtime ships zero styling logic.

[Get started](#get-started) · [API index](#api-index) · [Docs](https://salty-css.dev/docs) · [Discord](https://discord.gg/R6kr4KxMhP) · [GitHub](https://github.com/margarita-form/salty-css) · [NPM](https://www.npmjs.com/package/@salty-css/core)

## Features

- **Build-time compilation** — no runtime style injection, no FOUC, no client bundle cost.
- **Framework support** — Next.js (App + Pages, React Server Components, Webpack & Turbopack), React + Vite, React + Webpack, Astro.
- **Type safety** — TypeScript-first authoring, generated token types, an [ESLint plugin](https://www.npmjs.com/package/@salty-css/eslint-plugin-core).
- **Design tokens & theming** — static, responsive (media-bound), and conditional (data-attribute / class-bound) variables in one place.
- **Templates** — reusable style bundles with their own variants.
- **Modifiers** — custom value transformers (`'space:3'` → `'12px'`) defined in config.
- **Variants, compound variants, anyOf variants, default variants** out of the box.

## Get started

```bash
npx salty-css init
```

`init` detects your framework, installs the right packages, creates `salty.config.ts`, and wires the bundler plugin. Per-framework setup:

- **Next.js** → [salty-css.dev/docs/installation](https://salty-css.dev/docs/installation) — `withSaltyCss(nextConfig)` in `next.config.ts`. Auto-detects Webpack vs Turbopack; React Server Components supported.
- **React + Vite** → [salty-css.dev/docs/installation](https://salty-css.dev/docs/installation) — `saltyPlugin(__dirname)` in `vite.config.ts`.
- **Astro** → [salty-css.dev/docs/installation](https://salty-css.dev/docs/installation) — `saltyIntegration()` in `astro.config.mjs`.

React + Webpack (without Next.js) is also supported via `@salty-css/webpack`.

## CLI

| Command                             | Alias | What it does                                                                                                                   |
| ----------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------ |
| `npx salty-css init [directory]`    | —     | Detect framework, install packages, create `salty.config.ts`, wire the plugin.                                                 |
| `npx salty-css generate [filePath]` | `g`   | Scaffold a new Salty component file. Flags: `--name`, `--className`, `--tag`.                                                  |
| `npx salty-css build [directory]`   | `b`   | Compile `*.css.ts` files into `saltygen/index.css`. Not needed when the bundler plugin is running. Flags: `--watch`, `--mode`. |
| `npx salty-css update [version]`    | `up`  | Update all `@salty-css/*` packages. Defaults to `latest`. Flags: `--dir`, `--yes`.                                             |
| `npx salty-css --version`           | —     | Print CLI version.                                                                                                             |

Full reference: [salty-css.dev/docs/cli](https://salty-css.dev/docs/cli).

## Good to know

1. **File extensions matter.** `styled`, `className`, `keyframes`, and every `defineX(...)` call must live in a file ending `.css.ts`, `.css.tsx`, `.salty.ts`, `.styles.ts`, or `.styled.ts`. The compiler ignores everything else.
2. **Extending non-Salty components is fine** — `styled(NextLink, { ... })` — as long as the wrapped component forwards `className` to a DOM element.
3. **Async values & functions are allowed** (`base: { color: async () => 'red' }`), but heavy imports inside `*.css.ts` slow the build.
4. **React Server Components are supported** via `@salty-css/next` — no `'use client'` needed for styled output.

## ESLint

Salty CSS ships a small ESLint plugin and matching shareable config. Two rules, both `error` by default, both autofixable, both scoped to Salty files (`.css.ts`, `.css.tsx`, `.salty.ts`, `.styles.ts`, `.styled.ts`):

- **`@salty-css/core/must-be-exported`** — every `styled`, `className`, `keyframes`, and `defineX*` call must be exported; the compiler ignores anything else.
- **`@salty-css/core/no-variants-in-base`** — `variants` must be a sibling of `base`, not nested inside it.

```bash
npm i -D @salty-css/eslint-plugin-core @salty-css/eslint-config-core
```

**Flat config (ESLint 9+):**

```js
// eslint.config.mjs
import saltyConfig from '@salty-css/eslint-config-core/flat';

export default [saltyConfig];
```

**Legacy (`.eslintrc`):**

```js
module.exports = { extends: ['@salty-css/eslint-config-core'] };
```

Full reference → [salty-css.dev/docs/eslint](https://salty-css.dev/docs/eslint).

## API index

| Symbol                                          | Import                         | One-liner                                                                     | Docs                                                                    |
| ----------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [`styled`](#styled)                             | `@salty-css/react/styled`      | React component factory with variants & extension.                            | [api/styled](https://salty-css.dev/docs/api/styled)                     |
| [`className`](#classname)                       | `@salty-css/react/class-name`  | CSS class string with `.variant()` chaining.                                  | [api/classname](https://salty-css.dev/docs/api/classname)               |
| [Variants](#variants)                           | —                              | `variants`, `compoundVariants`, `anyOfVariants`, `defaultVariants` semantics. | [variants](https://salty-css.dev/docs/variants)                         |
| [Overrides](#overrides)                         | —                              | Extend components, swap element, override per-instance via `style`.           | [overrides](https://salty-css.dev/docs/overrides)                       |
| [ESLint plugin](#eslint)                        | `@salty-css/eslint-config-core` | Two rules: enforce `export` and correct `variants` placement on Salty files. | [eslint](https://salty-css.dev/docs/eslint)                             |
| [`defineConfig`](#defineconfig)                 | `@salty-css/core/config`       | Top-level project config.                                                     | [api/config](https://salty-css.dev/docs/api/config)                     |
| [`defineVariables`](#definevariables)           | `@salty-css/core/factories`    | Static, responsive, and conditional CSS variables (tokens).                   | [variables](https://salty-css.dev/docs/variables)                       |
| [Theming](#theming)                             | —                              | `data-theme` switcher built on conditional variables.                         | [theming](https://salty-css.dev/docs/theming)                           |
| [`defineGlobalStyles`](#defineglobalstyles)     | `@salty-css/core/factories`    | Global rules (`html`, `body`, etc.).                                          | [api/define-factories](https://salty-css.dev/docs/api/define-factories) |
| [`defineMediaQuery`](#definemediaquery)         | `@salty-css/core/factories`    | Named, reusable media queries.                                                | [media-queries](https://salty-css.dev/docs/media-queries)               |
| [`defineTemplates`](#definetemplates)           | `@salty-css/core/factories`    | Reusable style bundles, optionally with variants.                             | [templates](https://salty-css.dev/docs/templates)                       |
| [`defineFont`](#definefont)                     | `@salty-css/core/factories`    | `@font-face` (or `@import`) + CSS variable in one.                            | [fonts](https://salty-css.dev/docs/fonts)                               |
| [`defineImport`](#defineimport)                 | `@salty-css/core/factories`    | Pull external CSS into Salty's `imports` layer.                               | [imports](https://salty-css.dev/docs/imports)                           |
| [`keyframes`](#keyframes)                       | `@salty-css/react/keyframes`   | Typed `@keyframes` with params and initial-state injection.                   | [animations](https://salty-css.dev/docs/animations)                     |
| [`defineViewportClamp`](#defineviewportclamp)   | `@salty-css/core/helpers`      | Fluid `clamp()` values that scale with the viewport.                          | [viewport-clamp](https://salty-css.dev/docs/viewport-clamp)             |
| [`color`](#color)                               | `@salty-css/core/helpers`      | Color manipulation (`alpha`, `darken`, …).                                    | [color-function](https://salty-css.dev/docs/color-function)             |
| [Modifiers](#modifiers)                         | (on `defineConfig`)            | Custom value transformers, e.g. `'space:3'` → `'12px'`.                       | [modifiers](https://salty-css.dev/docs/modifiers)                       |
| [`withSaltyCss`](#withsaltycss-nextjs)          | `@salty-css/next`              | Next.js config wrapper (Webpack + Turbopack).                                 | [installation](https://salty-css.dev/docs/installation)                 |
| [`saltyPlugin` (Vite)](#saltyplugin-vite)       | `@salty-css/vite`              | Vite plugin.                                                                  | [installation](https://salty-css.dev/docs/installation)                 |
| [`saltyPlugin` (Webpack)](#saltyplugin-webpack) | `@salty-css/webpack`           | Webpack loader + plugin.                                                      | [installation](https://salty-css.dev/docs/installation)                 |
| [`saltyIntegration`](#saltyintegration-astro)   | `@salty-css/astro/integration` | Astro integration.                                                            | [installation](https://salty-css.dev/docs/installation)                 |

---

## `styled`

```ts
// components/button.css.ts
import { styled } from '@salty-css/react/styled';

export const Button = styled('button', {
  className: 'btn', // optional custom class
  element: 'button', // optional element override
  base: {
    padding: '0.6em 1.2em',
    border: '1px solid currentColor',
    '&:hover': { background: 'black', color: 'white' },
  },
  variants: {
    variant: {
      outlined: {},
      solid: { background: 'black', color: 'white' },
    },
  },
  compoundVariants: [
    /* { variant: 'solid', size: 'lg', css: { ... } } */
  ],
  defaultVariants: { variant: 'outlined' },
  defaultProps: { type: 'button' },
  passProps: false, // pass variant props through to the rendered element
  priority: undefined, // 0–8, higher wins; usually leave to auto
});
```

```tsx
<Button variant="solid">Save</Button>
```

See full reference → [salty-css.dev/docs/api/styled](https://salty-css.dev/docs/api/styled).

## `className`

Framework-agnostic class-string factory. The return value is a `string` you can drop in `className=`, plus a `.variant(name, value)` method for chaining variant classes.

```ts
// components/card.css.ts
import { className } from '@salty-css/react/class-name';

export const card = className({
  className: 'card',
  base: {
    padding: '1rem',
    borderRadius: '8px',
  },
  variants: {
    tone: {
      neutral: { background: '#f6f6f6' },
      brand: { background: '{colors.brand.main}' },
    },
  },
});
```

```tsx
<div className={`${card.variant('tone', 'brand')}`}>Hello</div>
```

See full reference → [salty-css.dev/docs/api/classname](https://salty-css.dev/docs/api/classname).

## Variants

`styled` and `className` share the same variant shape:

- **`variants`** — named axes (e.g. `size: { sm, md, lg }`). Each axis becomes a prop.
- **`compoundVariants`** — array; styles applied only when **all** listed axes match.
- **`anyOfVariants`** — array; styles applied when **any** listed axis matches.
- **`defaultVariants`** — values used when the prop is omitted at the call site.

```ts
styled('a', {
  base: { textDecoration: 'none' },
  variants: {
    size: { sm: { fontSize: 14 }, lg: { fontSize: 18 } },
    underline: { true: { textDecoration: 'underline' } },
  },
  compoundVariants: [{ size: 'lg', underline: true, css: { textUnderlineOffset: 4 } }],
  defaultVariants: { size: 'sm' },
});
```

Boolean variants accept `true`/`false` keys; pass them as `<Link underline />` shorthand. See [salty-css.dev/docs/variants](https://salty-css.dev/docs/variants).

## Overrides

- **Extend any component:** `styled(ExistingComponent, { ... })`. The wrapped component must accept `className`.
- **Swap the rendered element** for one instance: `<Button as="a" href="/x" />` (use `passProps` if you want variant props to reach the underlying element).
- **Per-instance style overrides:** `<Box style={{ ... }} />` and `<Box css={{ ... }} />` accept regular React `style` and Salty's `css` prop (overrides apply at the highest priority).

See [salty-css.dev/docs/overrides](https://salty-css.dev/docs/overrides) for `as`, `style`, CSS-variable overrides, and ref forwarding.

## `defineConfig`

```ts
// salty.config.ts
import { defineConfig } from '@salty-css/core/config';

export const config = defineConfig({
  importStrategy: 'root', // 'root' | 'component'
  variables: {
    /* see defineVariables */
  },
  global: {
    /* see defineGlobalStyles */
  },
  templates: {
    /* see defineTemplates */
  },
  modifiers: {
    /* see Modifiers */
  },
  reset: 'default', // 'default' | 'none' | GlobalStyles
  externalModules: ['react', 'react-dom'],
  strict: true, // true | 'warn' | false
  defaultUnit: 'px', // px, rem, em, vh, vw, % …
});
```

Full reference → [salty-css.dev/docs/api/config](https://salty-css.dev/docs/api/config).

## `defineVariables`

Tokens come in three flavours — static, responsive (media-bound), conditional (class/data-attribute-bound):

```ts
// styles/variables.css.ts
import { defineVariables } from '@salty-css/core/factories';

export default defineVariables({
  colors: {
    dark: '#111',
    light: '#fefefe',
    brand: { main: '#0070f3', highlight: '#ff4081' },
  },
  responsive: {
    base: { fontSize: { heading: '48px', body: '16px' } },
    '@largeMobileDown': { fontSize: { heading: '32px', body: '14px' } },
  },
  conditional: {
    theme: {
      dark: { backgroundColor: '{colors.dark}', textColor: '{colors.light}' },
      light: { backgroundColor: '{colors.light}', textColor: '{colors.dark}' },
    },
  },
});
```

Use as string references: `{colors.brand.main}`, `{fontSize.heading}`, `{theme.textColor}`.

See [salty-css.dev/docs/variables](https://salty-css.dev/docs/variables).

## Theming

The `conditional` bucket above wires up data-attribute / class-based themes with zero providers. Toggle a `data-theme` attribute on `<html>` (or any ancestor) and conditional variables resolve to the matching branch:

```html
<html data-theme="dark">
  <!-- '{theme.textColor}' resolves to '{colors.light}' -->
</html>
```

See the dark-mode walkthrough (with SSR flash fix) → [salty-css.dev/docs/theming](https://salty-css.dev/docs/theming).

## `defineGlobalStyles`

```ts
// styles/global.css.ts
import { defineGlobalStyles } from '@salty-css/core/factories';

export default defineGlobalStyles({
  html: { fontFamily: 'Inter, system-ui, sans-serif' },
  body: { margin: 0, background: '#fff' },
});
```

## `defineMediaQuery`

```ts
// styles/media.css.ts
import { defineMediaQuery } from '@salty-css/core/factories';

export const largeMobileDown = defineMediaQuery((media) => media.maxWidth(600));
export const darkMode = defineMediaQuery((media) => media.prefersColorScheme('dark'));
```

```ts
styled('span', { base: { fontSize: 64, '@largeMobileDown': { fontSize: 32 } } });
```

See [salty-css.dev/docs/media-queries](https://salty-css.dev/docs/media-queries).

## `defineTemplates`

Reusable style bundles. Static templates pick values by dot-path; function templates take a parameter.

```ts
// styles/templates.css.ts
import { defineTemplates } from '@salty-css/core/factories';

export default defineTemplates({
  textStyle: {
    heading: {
      base: { fontFamily: '{fontFamily.heading}', lineHeight: 1.1 },
      variants: {
        weight: { regular: { fontWeight: 500 }, heavy: { fontWeight: 800 } },
      },
      large: { fontSize: '{fontSize.heading.large}' },
      small: { fontSize: '{fontSize.heading.small}' },
    },
  },
  card: (padding: string) => ({
    padding,
    borderRadius: 8,
    boxShadow: '0 0 10px rgba(0,0,0,0.1)',
  }),
});
```

```ts
styled('h1', { base: { textStyle: 'heading.large@weight=heavy', card: '20px' } });
```

Rich-node variants, inheritance, and the `compoundVariants`/`anyOfVariants` rules: [salty-css.dev/docs/templates](https://salty-css.dev/docs/templates).

## `defineFont`

```ts
// styles/fonts.css.ts
import { defineFont } from '@salty-css/core/factories';

export const Inter = defineFont({
  name: 'Inter',
  variable: '--font-inter',
  display: 'swap',
  fallback: 'system-ui, sans-serif',
  variants: [
    { weight: 400, style: 'normal', src: '/fonts/inter-400.woff2' },
    { weight: 700, style: 'normal', src: ['/fonts/inter-700.woff2', '/fonts/inter-700.ttf'] },
  ],
});

// Or pull a remote stylesheet (e.g. Google Fonts) — emits @import + variable.
export const InterCdn = defineFont({
  name: 'Inter',
  variable: '--font-inter',
  import: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap',
});
```

`Inter.className`, `Inter.variable`, `Inter.fontFamily`, and `Inter.style` are available for explicit usage. See [salty-css.dev/docs/fonts](https://salty-css.dev/docs/fonts).

## `defineImport`

Pull external CSS into Salty's `imports` cascade layer (which sits **before** `reset`, `global`, `templates`, and your component layers — so your styles always win).

```ts
// styles/imports.css.ts
import { defineImport } from '@salty-css/core/factories';

export default defineImport(
  './reset.css', // relative
  'modern-normalize/modern-normalize.css', // node_modules
  '~normalize.css/normalize.css', // node_modules (~ form)
  '/fonts/inter.css', // public/ folder
  'https://fonts.googleapis.com/css2?family=Inter', // URL
  { url: './print.css', media: 'print' }, // media-conditional
  { url: './p3.css', supports: 'color(display-p3 1 1 1)' } // supports-conditional
);
```

Layer order: `@layer imports, reset, global, templates, fonts, l0…l8;`. See [salty-css.dev/docs/imports](https://salty-css.dev/docs/imports).

## `keyframes`

```ts
// styles/animations.css.ts
import { keyframes } from '@salty-css/react/keyframes';

export const fadeIn = keyframes({
  animationName: 'fadeIn',
  appendInitialStyles: true, // injects `from`/`0%` as base styles on the component
  params: { delay: '250ms', fillMode: 'forwards' },
  from: { opacity: 0 },
  to: { opacity: 1 },
});
```

```ts
styled('div', { base: { animation: fadeIn } });
```

See [salty-css.dev/docs/animations](https://salty-css.dev/docs/animations).

## `defineViewportClamp`

```ts
// styles/clamp.css.ts
import { defineViewportClamp } from '@salty-css/core/helpers';

export const fhdClamp = defineViewportClamp({ screenSize: 1920 });
export const mobileClamp = defineViewportClamp({ screenSize: 640, axis: 'horizontal' });
```

```ts
styled('span', { base: { fontSize: fhdClamp(96), '@largeMobileDown': { fontSize: mobileClamp(48) } } });
```

Options: `screenSize`, `axis` (`'horizontal' | 'vertical'`), `minMultiplier`, `maxMultiplier`, `minMaxUnit`. See [salty-css.dev/docs/viewport-clamp](https://salty-css.dev/docs/viewport-clamp).

## `color`

```ts
import { color } from '@salty-css/core/helpers';
import { styled } from '@salty-css/react/styled';

export const Tint = styled('span', {
  base: { backgroundColor: color('#000').alpha(0.5) },
});
```

Backed by the [Qix-/color](https://github.com/Qix-/color) library — `.alpha()`, `.darken()`, `.lighten()`, `.mix()`, etc. See [salty-css.dev/docs/color-function](https://salty-css.dev/docs/color-function).

## Modifiers

Custom value transformers registered on `defineConfig`. Each modifier is a `{ pattern, transform }` pair: when Salty sees a string value matching `pattern`, it replaces it with `transform(match).value` (and optionally emits extra CSS via `transform(match).css`).

```ts
// salty.config.ts
import { defineConfig } from '@salty-css/core/config';

export const config = defineConfig({
  modifiers: {
    spaceShorthand: {
      pattern: /^space:(\d+)$/,
      transform: (match) => {
        const n = Number(match.replace('space:', ''));
        return { value: `${n * 4}px` };
      },
    },
  },
});
```

```ts
styled('div', { base: { padding: 'space:3' } }); // → padding: 12px
```

See [salty-css.dev/docs/modifiers](https://salty-css.dev/docs/modifiers).

## `withSaltyCss` (Next.js)

```ts
// next.config.ts
import { withSaltyCss } from '@salty-css/next';

const nextConfig = {
  /* your config */
};
export default withSaltyCss(nextConfig);
// Or pin a bundler: withSaltyCss(nextConfig, { bundler: 'webpack' })
```

Options: `mode` (build mode override), `bundler` (`'auto' | 'webpack' | 'turbopack'`, defaults to auto-detect via `process.env.TURBOPACK`), `dir` (project root for Turbopack — defaults to `nextConfig.turbopack.root` or `process.cwd()`).

Next.js 14 CommonJS:

```js
const { withSaltyCss } = require('@salty-css/next');
module.exports = withSaltyCss(nextConfig);
```

See [salty-css.dev/docs/installation](https://salty-css.dev/docs/installation).

## `saltyPlugin` (Vite)

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { saltyPlugin } from '@salty-css/vite';

export default defineConfig({
  plugins: [saltyPlugin(__dirname)],
});
```

Options: `{ mode }`.

## `saltyPlugin` (Webpack)

```js
// webpack.config.js
const { saltyPlugin } = require('@salty-css/webpack');

module.exports = (env, argv) => {
  const config = {
    /* … */
  };
  saltyPlugin(config, __dirname);
  return config;
};
```

Signature: `saltyPlugin(config, dir, isServer?, cjs?, { mode? })`.

## `saltyIntegration` (Astro)

```ts
// astro.config.mjs
import { defineConfig } from 'astro/config';
import saltyIntegration from '@salty-css/astro/integration';

export default defineConfig({
  integrations: [saltyIntegration()],
});
```

Options: `srcDir` (defaults to `'src'`), `rootDir` (defaults to the Astro config root).

---

## Support

Help, questions, or feedback → [Join the Salty CSS Discord](https://discord.gg/R6kr4KxMhP). Bug reports → [GitHub issues](https://github.com/margarita-form/salty-css/issues).
