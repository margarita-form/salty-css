import { render } from '@testing-library/react';
import { styled } from './styled';

describe('styled() — css-* prop bridging', () => {
  it('writes a css-* prop to a --props-* CSS variable in the inline style', () => {
    // The generator scans base for `{props.X}` tokens and registers the keys.
    const Box = styled('div', { base: { color: '{props.color}' } });
    const { container } = render(<Box {...{ 'css-color': 'red' }} />);
    const styleAttr = container.querySelector('div')?.getAttribute('style') ?? '';
    expect(styleAttr).toContain('--props-color');
    expect(styleAttr).toContain('red');
  });

  it('camelCase token names are dash-cased on the CSS variable', () => {
    const Box = styled('div', { base: { backgroundColor: '{props.bgColor}' } });
    const { container } = render(<Box {...{ 'css-bg-color': 'tomato' }} />);
    const styleAttr = container.querySelector('div')?.getAttribute('style') ?? '';
    expect(styleAttr).toContain('--props-bg-color');
    expect(styleAttr).toContain('tomato');
  });

  it('omits the variable when the css-* prop is not supplied', () => {
    const Box = styled('div', { base: { color: '{props.color}' } });
    const { container } = render(<Box />);
    const styleAttr = container.querySelector('div')?.getAttribute('style') ?? '';
    expect(styleAttr).not.toContain('--props-color');
  });

  it('does not forward the css-* prop to the DOM', () => {
    const Box = styled('div', { base: { color: '{props.color}' } });
    const { container } = render(<Box {...{ 'css-color': 'red' }} />);
    const div = container.querySelector('div');
    expect(div?.getAttribute('css-color')).toBeNull();
  });
});
