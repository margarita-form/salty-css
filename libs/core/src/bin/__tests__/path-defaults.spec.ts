import { computePathDefaults } from '../path-defaults';

describe('computePathDefaults', () => {
  it('returns nothing for astro regardless of integrations or src', () => {
    expect(computePathDefaults({ framework: 'astro', integrations: ['astro'], hasSrcDir: true })).toEqual({});
    expect(computePathDefaults({ framework: 'astro', integrations: [], hasSrcDir: false })).toEqual({});
  });

  it('narrows to src and excludes dist for react + vite when src exists', () => {
    expect(computePathDefaults({ framework: 'react', integrations: ['vite'], hasSrcDir: true })).toEqual({
      include: ['src/**'],
      exclude: ['dist/**'],
    });
  });

  it('omits include for react + vite when src is absent', () => {
    expect(computePathDefaults({ framework: 'react', integrations: ['vite'], hasSrcDir: false })).toEqual({
      exclude: ['dist/**'],
    });
  });

  it('excludes the next build outputs for react + next', () => {
    expect(computePathDefaults({ framework: 'react', integrations: ['next'], hasSrcDir: false })).toEqual({
      exclude: ['.next/**', 'out/**'],
    });
  });

  it('dedupes a union of build outputs when several bundlers are detected', () => {
    expect(computePathDefaults({ framework: 'react', integrations: ['next', 'vite'], hasSrcDir: false })).toEqual({
      exclude: ['.next/**', 'out/**', 'dist/**'],
    });
  });

  it('returns nothing when no bundler integration is detected and src is absent', () => {
    expect(computePathDefaults({ framework: 'react', integrations: ['eslint'], hasSrcDir: false })).toEqual({});
  });
});
