import { defineRuntime } from './index';

const strip = (s: string) => s.replace(/\s/g, '');

describe('defineRuntime', () => {
  const runtime = defineRuntime({});

  describe('className', () => {
    it('returns a non-empty string', () => {
      const hash = runtime.className({ color: 'red' });
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('is deterministic for the same input', () => {
      const a = runtime.className({ color: 'red', padding: 4 });
      const b = runtime.className({ color: 'red', padding: 4 });
      expect(a).toBe(b);
    });

    it('produces different hashes for different inputs', () => {
      const a = runtime.className({ color: 'red' });
      const b = runtime.className({ color: 'blue' });
      expect(a).not.toBe(b);
    });
  });

  describe('css', () => {
    it('returns a CSS string for the given styles', async () => {
      const css = await runtime.css({ color: 'red' });
      expect(strip(css)).toBe(strip('color: red;'));
    });

    it('honors the supplied scope', async () => {
      const css = await runtime.css({ color: 'red' }, '.wrapper');
      expect(strip(css)).toBe(strip('.wrapper { color: red; }'));
    });

    it('threads the supplied config through to parseStyles', async () => {
      const scoped = defineRuntime({ variables: { colors: { brand: 'tomato' } } });
      const css = await scoped.css({ color: '{colors.brand}' }, '.x');
      expect(css).toContain('var(--colors-brand)');
    });
  });

  describe('resolve', () => {
    it('returns { className, css } with className matching the standalone hash', async () => {
      const styles = { color: 'red' };
      const result = await runtime.resolve(styles);
      expect(result.className).toBe(runtime.className(styles));
      expect(typeof result.css).toBe('string');
      expect(result.css.length).toBeGreaterThan(0);
    });

    it('defaults the scope to ".${className}"', async () => {
      const styles = { color: 'red' };
      const { className, css } = await runtime.resolve(styles);
      expect(strip(css)).toBe(strip(`.${className} { color: red; }`));
    });

    it('honors an explicit scope override', async () => {
      const { css } = await runtime.resolve({ color: 'red' }, '.override');
      expect(strip(css)).toBe(strip('.override { color: red; }'));
    });
  });

  // Locks the documented feature-support claims in /docs/api/runtime/
  // through the public defineRuntime entry point. parser.spec.ts covers
  // these end-to-end via parseStyles; these are the same shapes asserted
  // through the runtime surface a CMS consumer would actually call.
  describe('feature support through defineRuntime', () => {
    it('resolves {token} references against the supplied variables', async () => {
      const scoped = defineRuntime({ variables: { colors: { brand: 'tomato' } } });
      const { css } = await scoped.resolve({ color: '{colors.brand}' });
      expect(css).toContain('var(--colors-brand)');
    });

    it('preserves @media blocks scoped under the default hash class', async () => {
      const { className, css } = await runtime.resolve({
        color: 'red',
        '@media (min-width: 600px)': { color: 'blue' },
      });
      expect(strip(css)).toContain(strip(`.${className} { color: red; }`));
      const compact = css.replace(/\s/g, '');
      expect(compact).toContain('@media(min-width:600px){');
      expect(compact).toContain(`.${className}{color:blue;}`);
    });

    it('expands ampersand pseudo-class modifiers under the scope', async () => {
      const { className, css } = await runtime.resolve({
        color: 'red',
        '&:hover': { color: 'blue' },
      });
      expect(strip(css)).toContain(strip(`.${className}:hover { color: blue; }`));
    });

    it('expands nested child selectors under the scope', async () => {
      const { className, css } = await runtime.resolve({
        '& > svg': { fill: 'red' },
      });
      expect(strip(css)).toContain(strip(`.${className} > svg { fill: red; }`));
    });

    it('expands template references against the supplied templates', async () => {
      const tpl = defineRuntime({
        templates: { textStyle: { caption: { fontSize: '12px', lineHeight: '1.4' } } },
      });
      const { css } = await tpl.resolve({ textStyle: 'caption' });
      const compact = css.replace(/\s/g, '');
      expect(compact).toContain('font-size:12px');
      expect(compact).toContain('line-height:1.4');
    });

    it('emits variant selectors but does not pick a branch (no prop mapping)', async () => {
      const { className, css } = await runtime.resolve({
        variants: { size: { sm: { padding: '4px' } } },
      });
      const compact = css.replace(/\s/g, '');
      expect(compact).toContain(`.${className}.size-sm{`);
      expect(compact).toContain('padding:4px');
    });

    it('hashes structurally-equal objects to the same className', () => {
      const a = { color: 'red', padding: '4px', '&:hover': { color: 'blue' } };
      const b = { color: 'red', padding: '4px', '&:hover': { color: 'blue' } };
      expect(runtime.className(a)).toBe(runtime.className(b));
    });

    describe('global selector targeting', () => {
      it('explicit scope ":root" emits a bare :root rule (existing path)', async () => {
        const css = await runtime.css({ '--brand': 'tomato' }, ':root');
        expect(strip(css)).toBe(strip(':root { --brand: tomato; }'));
      });

      it('global key emits :root as an unscoped rule alongside the component class', async () => {
        const { className, css } = await runtime.resolve({
          color: 'red',
          global: {
            ':root': { '--brand': 'tomato' },
          },
        });
        const compact = css.replace(/\s/g, '');
        expect(compact).toContain(`.${className}{color:red;}`);
        expect(compact).toContain(':root{--brand:tomato;}');
        // :root must not be appended to the hash class as a pseudo-class
        expect(compact).not.toContain(`.${className}:root`);
      });

      it('global key emits html and body as unscoped rules', async () => {
        const { css } = await runtime.resolve({
          global: {
            html: { colorScheme: 'dark' },
            body: { margin: '0' },
          },
        });
        const compact = css.replace(/\s/g, '');
        expect(compact).toContain('html{color-scheme:dark;}');
        expect(compact).toContain('body{margin:0;}');
      });

      it('global key emits the universal selector as an unscoped rule', async () => {
        const { css } = await runtime.resolve({
          global: {
            '*': { boxSizing: 'border-box' },
          },
        });
        expect(css.replace(/\s/g, '')).toContain('*{box-sizing:border-box;}');
      });

      it('global key supports nested selectors starting from an empty scope', async () => {
        const { css } = await runtime.resolve({
          global: {
            ':root': { '&:has(.dark)': { '--bg': 'black' } },
          },
        });
        expect(css.replace(/\s/g, '')).toContain(':root:has(.dark){--bg:black;}');
      });
    });
  });
});
