import { createRef } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { StyledGenerator } from '@salty-css/core/generators';
import { styled } from './styled';

describe('styled() — basic rendering', () => {
  it('renders the requested HTML tag with the generated hash class', () => {
    const Button = styled('button', { base: { color: 'red' } });
    const { container } = render(<Button>click</Button>);

    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    expect(button?.textContent).toBe('click');
    expect(button?.className).toBe(Button.generator.cssClassName);
  });

  it('marks the rendered node as an unoptimized client component', () => {
    const Button = styled('button', { base: { color: 'red' } });
    const { container } = render(<Button />);
    const button = container.querySelector('button');
    expect(button?.getAttribute('data-unoptimized-client-component')).toBe('true');
  });

  it('exposes static markers: isStyled, toString, generator', () => {
    const Button = styled('button', { base: { color: 'red' } });
    expect((Button as unknown as { isStyled: boolean }).isStyled).toBe(true);
    expect(String(Button)).toBe(`.${Button.generator.cssClassName}`);
    expect(Button.generator).toBeInstanceOf(StyledGenerator);
  });
});

describe('styled() — variants', () => {
  // Variant names are deliberately non-standard (mood/flavor) so React's
  // DOM-attribute allowlist isn't doing the stripping for us; the test
  // exercises element-factory's _vks logic.
  const Box = styled('div', {
    base: { color: 'black' },
    variants: {
      mood: {
        warm: { background: 'red' },
        cool: { borderColor: 'currentColor' },
      },
      flavor: {
        sweet: { padding: 4 },
        sour: { padding: 12 },
      },
    },
  });

  it('appends a variant-value class when the prop is provided', () => {
    const { container } = render(<Box mood="warm" />);
    const div = container.querySelector('div');
    expect(div?.className.split(' ')).toContain('mood-warm');
  });

  it('does not forward the variant prop to the DOM', () => {
    const { container } = render(<Box mood="warm" flavor="sour" />);
    const div = container.querySelector('div');
    expect(div?.getAttribute('mood')).toBeNull();
    expect(div?.getAttribute('flavor')).toBeNull();
  });
});

describe('styled() — defaultVariants', () => {
  const Box = styled('div', {
    base: { color: 'black' },
    variants: {
      flavor: { sweet: { padding: 4 }, sour: { padding: 12 } },
    },
    defaultVariants: { flavor: 'sweet' },
  });

  it('applies the default variant class when the prop is omitted', () => {
    const { container } = render(<Box />);
    expect(container.querySelector('div')?.className.split(' ')).toContain('flavor-sweet');
  });

  it('overrides the default variant class when a prop is supplied', () => {
    const { container } = render(<Box flavor="sour" />);
    const classes = container.querySelector('div')?.className.split(' ') ?? [];
    expect(classes).toContain('flavor-sour');
    expect(classes).not.toContain('flavor-sweet');
  });
});

describe('styled() — element override', () => {
  it('renders the params.element tag instead of the tagName argument', () => {
    const Link = styled('button', { element: 'a', base: { color: 'red' } });
    const { container } = render(<Link>x</Link>);
    expect(container.querySelector('a')).not.toBeNull();
    expect(container.querySelector('button')).toBeNull();
  });
});

describe('styled() — user props', () => {
  const Box = styled('div', { base: { color: 'red' } });

  it('merges the generated hash class with a user className', () => {
    const { container } = render(<Box className="extra" />);
    const classes = container.querySelector('div')?.className.split(' ') ?? [];
    expect(classes).toContain(Box.generator.cssClassName);
    expect(classes).toContain('extra');
  });

  it('preserves user-supplied style entries on the rendered node', () => {
    const { container } = render(<Box style={{ color: 'blue' }} />);
    expect(container.querySelector('div')?.style.color).toBe('blue');
  });

  it('rewrites {token} values in style via parseVariableTokens', () => {
    // jsdom drops `var(--x)` from inline style, so assert against the
    // SSR-serialized HTML where React preserves the transformed value verbatim.
    const html = renderToString(<Box style={{ background: '{colors.primary}' }} />);
    expect(html).toContain('var(--colors-primary)');
    expect(html).not.toContain('{colors.primary}');
  });

  it('passes arbitrary HTML attributes through to the DOM', () => {
    const { container } = render(<Box aria-label="hello" data-x="42" />);
    const div = container.querySelector('div');
    expect(div?.getAttribute('aria-label')).toBe('hello');
    expect(div?.getAttribute('data-x')).toBe('42');
  });

  it('renders children', () => {
    const { container } = render(<Box>hello world</Box>);
    expect(container.querySelector('div')?.textContent).toBe('hello world');
  });
});

describe('styled() — refs and events', () => {
  it('forwards refs to the underlying DOM node', () => {
    const Button = styled('button', { base: { color: 'red' } });
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>x</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('invokes onClick when the rendered node is clicked', () => {
    const Button = styled('button', { base: { color: 'red' } });
    const onClick = vi.fn();
    const { container } = render(<Button onClick={onClick}>x</Button>);
    fireEvent.click(container.querySelector('button')!);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('styled() — defaultProps', () => {
  it('applies defaultProps from params onto the rendered DOM node', () => {
    const Button = styled('button', {
      base: { color: 'red' },
      defaultProps: { type: 'button' },
    });
    const { container } = render(<Button />);
    expect(container.querySelector('button')?.getAttribute('type')).toBe('button');
  });
});
