import { GlobalStyles } from '../config/config-types';

export const saltyReset: GlobalStyles = {
  /** Set box model to border-box */
  '*, *::before, *::after': {
    boxSizing: 'border-box',
  },
  /** Remove default margin and padding */
  '*': {
    margin: 0,
  },
  /** Remove adjust font properties */
  html: {
    lineHeight: 1.15,
    textSizeAdjust: '100%',
    WebkitFontSmoothing: 'antialiased',
  },
  /** Make media elements responsive */
  'img, picture, video, canvas, svg': {
    display: 'block',
    maxWidth: '100%',
  },
  /** Avoid overflow of text */
  'p, h1, h2, h3, h4, h5, h6': {
    overflowWrap: 'break-word',
  },
  /** Improve text wrapping */
  p: {
    textWrap: 'pretty',
  },
  'h1, h2, h3, h4, h5, h6': {
    textWrap: 'balance',
  },
  /** Improve button line height */
  button: {
    lineHeight: '1em',
    color: 'currentColor',
  },
  /** Improve form elements */
  'input, optgroup, select, textarea': {
    fontFamily: 'inherit',
    fontSize: '100%',
    lineHeight: '1.15em',
  },
};
