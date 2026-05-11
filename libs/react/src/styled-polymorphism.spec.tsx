import { createRef } from 'react';
import { render } from '@testing-library/react';
import { styled } from './styled';

describe('styled() — polymorphic composition', () => {
  it('renders the inner tag and merges hash classes from both layers', () => {
    const Inner = styled('span', { base: { color: 'red' } });
    const Outer = styled(Inner, { base: { fontWeight: 'bold' } });

    const { container } = render(<Outer>x</Outer>);
    const span = container.querySelector('span');
    expect(span).not.toBeNull();

    const classes = span?.className.split(' ') ?? [];
    expect(classes).toContain(Inner.generator.cssClassName);
    expect(classes).toContain(Outer.generator.cssClassName);
  });

  it('the outermost element override wins at the leaf', () => {
    const Inner = styled('span', { base: {} });
    const Outer = styled(Inner, { element: 'a', base: {} });

    const { container } = render(<Outer>x</Outer>);
    expect(container.querySelector('a')).not.toBeNull();
    expect(container.querySelector('span')).toBeNull();
  });

  it('composes three layers: outermost element propagates through', () => {
    const Base = styled('div', { base: {} });
    const Mid = styled(Base, { base: {} });
    const Top = styled(Mid, { element: 'section', base: {} });

    const { container } = render(<Top>x</Top>);
    expect(container.querySelector('section')).not.toBeNull();
    expect(container.querySelector('div')).toBeNull();
  });

  it("propagates outer's variant prop into inner's _vks so it never reaches DOM", () => {
    const Inner = styled('span', { base: {} });
    const Outer = styled(Inner, {
      base: {},
      variants: { tone: { warm: { color: 'red' }, cold: { color: 'blue' } } },
    });

    const { container } = render(<Outer tone="warm">x</Outer>);
    const span = container.querySelector('span');
    expect(span?.className.split(' ')).toContain('tone-warm');
    expect(span?.getAttribute('tone')).toBeNull();
  });

  it('forwards refs through composed styled components', () => {
    const Inner = styled('button', { base: {} });
    const Outer = styled(Inner, { base: {} });

    const ref = createRef<HTMLButtonElement>();
    render(<Outer ref={ref}>x</Outer>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});

describe('styled() — runtime extend prop', () => {
  it('switches the rendered tag when no element override is set in params', () => {
    const Box = styled('div', { base: {} });
    const { container } = render(<Box extend="section">x</Box>);
    expect(container.querySelector('section')).not.toBeNull();
    expect(container.querySelector('div')).toBeNull();
  });
});
