import { describe, expect, it } from 'vitest';
import { defineImport, ImportFactory } from './define-import';

describe('defineImport', () => {
  it('returns an ImportFactory with isDefineImport flag and the original specs', () => {
    const factory = defineImport('./reset.css', 'modern-normalize/modern-normalize.css', 'https://fonts.googleapis.com/css2?family=Inter');

    expect(factory).toBeInstanceOf(ImportFactory);
    expect(factory.isDefineImport).toBe(true);
    expect(factory._current).toEqual(['./reset.css', 'modern-normalize/modern-normalize.css', 'https://fonts.googleapis.com/css2?family=Inter']);
  });

  it('accepts object form with media and supports', () => {
    const factory = defineImport({ url: './print.css', media: 'print' }, { url: './oklch.css', supports: 'color(display-p3 1 1 1)' });

    expect(factory._current).toEqual([
      { url: './print.css', media: 'print' },
      { url: './oklch.css', supports: 'color(display-p3 1 1 1)' },
    ]);
  });

  it('stores and exposes the source file path via _setPath', () => {
    const factory = defineImport('./reset.css');
    expect(factory._path).toBeUndefined();

    const returned = factory._setPath('/abs/path/to/imports.css.ts');
    expect(returned).toBe(factory);
    expect(factory._path).toBe('/abs/path/to/imports.css.ts');
  });
});
