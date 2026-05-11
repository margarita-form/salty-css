import { createRef } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { styledClient } from './styled-client';

// Mirrors the shape that `transformSaltyFile` emits at build time:
//   styled(tagName, "class1 class2", { hash, variantKeys, ... })

describe('styledClient() — build-output contract', () => {
  it('renders the given tag and applies the precomputed className', () => {
    const Button = styledClient('button', 'hash-abc class-extra', { hash: 'hash-abc' });
    const { container } = render(<Button>x</Button>);
    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    const classes = button?.className.split(' ') ?? [];
    expect(classes).toContain('hash-abc');
    expect(classes).toContain('class-extra');
  });

  it('translates variant props into variant-value classes', () => {
    const Box = styledClient('div', 'box', {
      hash: 'box',
      variantKeys: ['mood', 'flavor=sweet'],
    });
    const { container } = render(<Box mood="warm" />);
    const classes = container.querySelector('div')?.className.split(' ') ?? [];
    expect(classes).toContain('mood-warm');
    expect(classes).toContain('flavor-sweet');
    expect(container.querySelector('div')?.getAttribute('mood')).toBeNull();
  });

  it('falls back to the default variant value when the prop is omitted', () => {
    const Box = styledClient('div', 'box', {
      hash: 'box',
      variantKeys: ['flavor=sweet'],
    });
    const { container } = render(<Box />);
    expect(container.querySelector('div')?.className.split(' ')).toContain('flavor-sweet');
  });

  it('forwards refs to the underlying DOM node', () => {
    const Button = styledClient('button', 'hash', { hash: 'hash' });
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>x</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('forwards onClick handlers', () => {
    const Button = styledClient('button', 'hash', { hash: 'hash' });
    const onClick = vi.fn();
    const { container } = render(<Button onClick={onClick}>x</Button>);
    fireEvent.click(container.querySelector('button')!);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies defaultProps from the generator client props', () => {
    const Button = styledClient('button', 'hash', {
      hash: 'hash',
      defaultProps: { type: 'submit' },
    });
    const { container } = render(<Button />);
    expect(container.querySelector('button')?.getAttribute('type')).toBe('submit');
  });

  it('exposes isStyled and toString markers like styled()', () => {
    const Box = styledClient('div', 'hash', { hash: 'hash' });
    expect((Box as unknown as { isStyled: boolean }).isStyled).toBe(true);
    expect(String(Box)).toBe('.hash');
  });
});
