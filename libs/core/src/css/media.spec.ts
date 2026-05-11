import { media, MediaQueryFactory } from './media';

describe('MediaQueryFactory', () => {
  it('produces min-width with numeric input as px', () => {
    expect(String(media.minWidth(768))).toBe('@media (min-width: 768px)');
  });

  it('passes through string width units', () => {
    expect(String(media.minWidth('20em'))).toBe('@media (min-width: 20em)');
  });

  it('produces max-width / min-height / max-height', () => {
    expect(String(media.maxWidth(1024))).toBe('@media (max-width: 1024px)');
    expect(String(media.minHeight(400))).toBe('@media (min-height: 400px)');
    expect(String(media.maxHeight('30rem'))).toBe('@media (max-height: 30rem)');
  });

  it('exposes orientation getters', () => {
    expect(String(media.portrait)).toBe('@media (orientation: portrait)');
    expect(String(media.landscape)).toBe('@media (orientation: landscape)');
  });

  it('exposes color-scheme helpers', () => {
    expect(String(media.dark)).toBe('@media (prefers-color-scheme: dark)');
    expect(String(media.light)).toBe('@media (prefers-color-scheme: light)');
    expect(String(media.prefersColorScheme('no-preference'))).toBe('@media (prefers-color-scheme: no-preference)');
  });

  it('exposes media-type getters', () => {
    expect(String(media.print)).toBe('@media print');
    expect(String(media.screen)).toBe('@media screen');
    expect(String(media.speech)).toBe('@media speech');
    expect(String(media.all)).toBe('@media all');
    expect(String(media.not)).toBe('@media not');
  });

  it('exposes reduced-motion', () => {
    expect(String(media.reducedMotion)).toBe('@media (prefers-reduced-motion: reduce)');
  });

  it('passes custom queries through unchanged', () => {
    expect(String(media.custom('(hover: hover)'))).toBe('@media (hover: hover)');
  });

  it('chains via .and', () => {
    const result = String(media.dark.and.minWidth(768));
    expect(result).toBe('@media (prefers-color-scheme: dark) and (min-width: 768px)');
  });

  it('joins via .or with a comma', () => {
    const result = String(media.portrait.or.minWidth(900));
    expect(result).toBe('@media (orientation: portrait), (min-width: 900px)');
  });

  it('marks results as media', () => {
    const value = media.minWidth(0) as { isMedia: boolean };
    expect(value.isMedia).toBe(true);
  });

  it('default base for a fresh factory is @media', () => {
    const factory = new MediaQueryFactory();
    expect(String(factory.minWidth(100))).toBe('@media (min-width: 100px)');
  });
});
