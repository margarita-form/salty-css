# Salty Css

## Basic usage example with Button

### Initial requirements

1. Add `saltyPlugin` to vite or webpack config from `@salty-css/vite` or `@salty-css/webpack`
2. Create `salty-config.ts` to the root of your project
3. Import global styles to any regular .css file from `saltygen/index.css` (does not exist during first run, cli command coming later)
4. Create salty components with styled only inside files that end with `.css.ts`, `.salty.ts` `.styled.ts` or `.styles.ts`

### Code examples

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
  const wrapper = useRef<HTMLElement>(null);

  return (
    <Wrapper className="theme-light" ref={wrapper}>
      <Button variant="solid" onClick={() => alert('It is a button.')}>
        Outlined
      </Button>
    </Wrapper>
  );
};
```

**Wrapper** (`components/wrapper/wrapper.css`)

```tsx
import { styled } from '@salty-css/react/styled';

export const Wrapper = styled('div', {
  display: 'block',
  padding: '2vw',
});
```

**Button** (`components/button/button.css`)

```tsx
import { styled } from '@salty-css/react/styled';

export const Button = styled('button', {
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
