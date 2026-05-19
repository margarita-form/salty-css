import { describe, expect, it, vi } from 'vitest';
import { resolveImport } from './resolve-import';

const sourceFile = '/abs/project/src/styles/imports.css.ts';
const destDir = '/abs/project/saltygen';

describe('resolveImport', () => {
  describe('external URLs', () => {
    it('passes through https URLs verbatim', () => {
      const { rule } = resolveImport('https://fonts.googleapis.com/css2?family=Inter', sourceFile, destDir);
      expect(rule).toBe(`@import url('https://fonts.googleapis.com/css2?family=Inter');`);
    });

    it('passes through protocol-relative URLs verbatim', () => {
      const { rule } = resolveImport('//cdn.example.com/style.css', sourceFile, destDir);
      expect(rule).toBe(`@import url('//cdn.example.com/style.css');`);
    });
  });

  describe('public-folder URLs', () => {
    it('passes through paths starting with /', () => {
      const { rule } = resolveImport('/fonts/inter.css', sourceFile, destDir);
      expect(rule).toBe(`@import url('/fonts/inter.css');`);
    });
  });

  describe('relative paths', () => {
    it('rewrites the URL to be relative to saltygen/css/_imports.css', () => {
      const { rule } = resolveImport('./reset.css', sourceFile, destDir);
      // _imports.css lives at /abs/project/saltygen/css/_imports.css; reset.css at /abs/project/src/styles/reset.css
      expect(rule).toBe(`@import url('../../src/styles/reset.css');`);
    });

    it('handles parent-relative paths', () => {
      const { rule } = resolveImport('../shared/print.css', sourceFile, destDir);
      expect(rule).toBe(`@import url('../../src/shared/print.css');`);
    });
  });

  describe('node_modules', () => {
    it('resolves bare specifiers, copies the file into saltygen/imports/, and emits a relative URL', () => {
      const resolveModule = vi.fn().mockReturnValue('/abs/project/node_modules/modern-normalize/modern-normalize.css');
      const copyAsset = vi.fn();

      const { rule } = resolveImport('modern-normalize/modern-normalize.css', sourceFile, destDir, { resolveModule, copyAsset });

      expect(resolveModule).toHaveBeenCalledWith('modern-normalize/modern-normalize.css', sourceFile);
      expect(copyAsset).toHaveBeenCalledTimes(1);
      const [from, to] = copyAsset.mock.calls[0];
      expect(from).toBe('/abs/project/node_modules/modern-normalize/modern-normalize.css');
      expect(to).toMatch(/saltygen\/imports\/[A-Za-z0-9]{6}-modern-normalize\.css$/);
      expect(rule).toMatch(/^@import url\('\.\.\/imports\/[A-Za-z0-9]{6}-modern-normalize\.css'\);$/);
    });

    it('treats ~ prefix as equivalent to a bare specifier', () => {
      const resolveModule = vi.fn().mockReturnValue('/abs/project/node_modules/normalize.css/normalize.css');
      const copyAsset = vi.fn();

      const { rule: bareRule } = resolveImport('normalize.css/normalize.css', sourceFile, destDir, { resolveModule, copyAsset });
      const { rule: tildeRule } = resolveImport('~normalize.css/normalize.css', sourceFile, destDir, { resolveModule, copyAsset });

      expect(resolveModule).toHaveBeenNthCalledWith(1, 'normalize.css/normalize.css', sourceFile);
      expect(resolveModule).toHaveBeenNthCalledWith(2, 'normalize.css/normalize.css', sourceFile);
      expect(bareRule).toBe(tildeRule);
    });
  });

  describe('object form', () => {
    it('appends media after the URL', () => {
      const { rule } = resolveImport({ url: '/print.css', media: 'print' }, sourceFile, destDir);
      expect(rule).toBe(`@import url('/print.css') print;`);
    });

    it('appends supports() after the URL', () => {
      const { rule } = resolveImport({ url: '/p3.css', supports: 'color(display-p3 1 1 1)' }, sourceFile, destDir);
      expect(rule).toBe(`@import url('/p3.css') supports(color(display-p3 1 1 1));`);
    });

    it('appends supports() before media when both are present', () => {
      const { rule } = resolveImport({ url: '/both.css', media: 'print', supports: '(display: grid)' }, sourceFile, destDir);
      expect(rule).toBe(`@import url('/both.css') supports((display: grid)) print;`);
    });
  });
});
