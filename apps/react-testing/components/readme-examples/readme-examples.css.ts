// Validation fixture for README example snippets.
// Every import and factory call below mirrors a snippet in salty-css-packages/README.md.
// If an import path or a factory shape drifts in the library, the build of this
// file (via `npm run build:react`) will surface it.

import { styled } from '@salty-css/react/styled';
import { className } from '@salty-css/react/class-name';
import { keyframes } from '@salty-css/react/keyframes';

import {
  defineVariables,
  defineGlobalStyles,
  defineMediaQuery,
  defineTemplates,
  defineFont,
  defineImport,
} from '@salty-css/core/factories';
import { defineViewportClamp, color } from '@salty-css/core/helpers';

// --- defineVariables (README §`defineVariables`) ---------------------------------
// Namespaced under `readme.*` so this fixture cannot collide with the
// project-wide tokens in apps/react-testing/styles/variables.css.ts.
export const readmeTokens = defineVariables({
  readme: {
    colors: {
      brand: '#0070f3',
      highlight: '#ff4081',
    },
  },
});

// --- defineMediaQuery (README §`defineMediaQuery`) -----------------------------
export const readmeLargeMobileDown = defineMediaQuery((media) => media.maxWidth(600));
export const readmeDarkMode = defineMediaQuery((media) => media.prefersColorScheme('dark'));

// --- defineTemplates (README §`defineTemplates`) --------------------------------
// Rich-variant template — exercises base / variants / leaf-overrides at once.
// Namespaced under `readmeText` to avoid clashing with the existing `textStyle` template.
export const readmeTemplates = defineTemplates({
  readmeText: {
    heading: {
      base: { lineHeight: '1.1em' },
      variants: {
        weight: {
          regular: { fontWeight: 500 },
          heavy: { fontWeight: 800 },
        },
      },
      large: { fontSize: '48px' },
      small: { fontSize: '32px' },
    },
  },
  readmeCard: (padding: string) => ({
    padding,
    borderRadius: '8px',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
  }),
});

// --- defineGlobalStyles (README §`defineGlobalStyles`) --------------------------
// Scoped to a class so it cannot affect anything else rendered by the test app.
export const readmeGlobals = defineGlobalStyles({
  '.readme-examples-root': {
    fontFamily: 'system-ui, sans-serif',
  },
});

// --- defineFont (README §`defineFont`) ------------------------------------------
// `import:` form — no local file lookups, safe for the fixture.
export const ReadmeFont = defineFont({
  name: 'ReadmeInter',
  variable: '--font-readme-inter',
  fallback: 'system-ui, sans-serif',
  import: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap',
});

// --- defineImport (README §`defineImport`) --------------------------------------
// URL-only specs so build-time path resolution doesn't need real files.
export const readmeImports = defineImport(
  'https://fonts.googleapis.com/css2?family=Inter&display=swap',
  { url: 'https://example.com/print.css', media: 'print' },
);

// --- keyframes (README §`keyframes`) --------------------------------------------
export const readmeFadeIn = keyframes({
  animationName: 'readmeFadeIn',
  appendInitialStyles: true,
  params: { delay: '250ms', fillMode: 'forwards' },
  from: { opacity: 0 },
  to: { opacity: 1 },
});

// --- defineViewportClamp (README §`defineViewportClamp`) ------------------------
export const readmeFhdClamp = defineViewportClamp({ screenSize: 1920 });
export const readmeMobileClamp = defineViewportClamp({ screenSize: 640, axis: 'horizontal' });

// --- styled + variants + compoundVariants + defaultVariants (README §`styled`) --
export const ReadmeButton = styled('button', {
  className: 'readme-btn',
  base: {
    padding: '0.6em 1.2em',
    border: '1px solid currentColor',
    background: 'transparent',
    cursor: 'pointer',
    transition: '200ms',
    '&:hover': { background: 'black', color: 'white' },
    '&:disabled': { opacity: 0.25, pointerEvents: 'none' },
  },
  variants: {
    variant: {
      outlined: {},
      solid: { background: 'black', color: 'white' },
    },
    size: {
      sm: { fontSize: 14 },
      lg: { fontSize: 18 },
    },
  },
  compoundVariants: [
    { variant: 'solid', size: 'lg', css: { letterSpacing: '0.02em' } },
  ],
  defaultVariants: { variant: 'outlined', size: 'sm' },
  defaultProps: { type: 'button' },
});

// --- styled with template + keyframes + viewport-clamp + color ------------------
export const ReadmeHeading = styled('h1', {
  base: {
    readmeText: 'heading.large@weight=heavy',
    animation: readmeFadeIn,
    fontSize: readmeFhdClamp(64),
    color: color('#000').alpha(0.85),
    backgroundColor: '{readme.colors.brand}',
    '@readmeLargeMobileDown': { fontSize: readmeMobileClamp(32) },
  },
});

// --- styled with template + default-variant fallback (README §`defineTemplates`) -
export const ReadmeSubheading = styled('h2', {
  base: {
    readmeText: 'heading.small@weight=regular',
  },
});

// --- className + .variant() chaining (README §`className`) ----------------------
export const readmeCard = className({
  className: 'readme-card',
  base: {
    padding: '1rem',
    borderRadius: '8px',
  },
  variants: {
    tone: {
      neutral: { background: '#f6f6f6' },
      brand: { background: '{readme.colors.brand}' },
    },
  },
});

// --- styled extension (README §Overrides) ---------------------------------------
// `styled(SaltyComponent, …)` is the canonical "extend an existing styled component" pattern.
export const ReadmeDangerButton = styled(ReadmeButton, {
  base: {
    borderColor: 'crimson',
    color: 'crimson',
  },
  defaultVariants: { variant: 'solid' },
});
