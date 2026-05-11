import { render } from '@testing-library/react';
import { styled } from './styled';

// Use variant names that React 19 doesn't filter from a <div> via its
// legacy DOM-attribute allowlist (e.g. `size`). `mood` and `flavor` are
// safe non-HTML names.
const variants = {
  mood: { warm: { color: 'red' }, cool: { color: 'blue' } },
  flavor: { sweet: { padding: 4 }, sour: { padding: 12 } },
};

describe('styled() — passProps', () => {
  it('strips all variant props from the DOM by default', () => {
    const Box = styled('div', { base: {}, variants });
    const { container } = render(<Box mood="warm" flavor="sour" />);
    const div = container.querySelector('div');
    expect(div?.getAttribute('mood')).toBeNull();
    expect(div?.getAttribute('flavor')).toBeNull();
  });

  it('keeps all variant props on the DOM when passProps is true', () => {
    const Box = styled('div', { base: {}, variants, passProps: true });
    const { container } = render(<Box mood="warm" flavor="sour" />);
    const div = container.querySelector('div');
    expect(div?.getAttribute('mood')).toBe('warm');
    expect(div?.getAttribute('flavor')).toBe('sour');
  });

  it('keeps only listed names when passProps is a string array', () => {
    const Box = styled('div', { base: {}, variants, passProps: ['mood'] });
    const { container } = render(<Box mood="warm" flavor="sour" />);
    const div = container.querySelector('div');
    expect(div?.getAttribute('mood')).toBe('warm');
    expect(div?.getAttribute('flavor')).toBeNull();
  });

  it('does not forward passProps itself as an attribute on a plain HTML element', () => {
    const Box = styled('div', { base: {}, variants, passProps: true });
    const { container } = render(<Box mood="warm" />);
    expect(container.querySelector('div')?.hasAttribute('passprops')).toBe(false);
    expect(container.querySelector('div')?.hasAttribute('passProps')).toBe(false);
  });
});
