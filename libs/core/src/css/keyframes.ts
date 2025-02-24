import { parseStyles } from '../generator/parse-styles';
import { CssStyles, StyleValue } from '../types';
import { toHash } from '../util';

type KeyframeKeys = number | 'from' | 'to' | `${number}%`;

type Keyframes = {
  [key in KeyframeKeys]?: CssStyles;
};

interface KeyframesConfig {
  animationName?: string;
  appendInitialStyles?: boolean;
  params?: KeyframesParams;
}

interface KeyframesParams {
  duration?: string;
  delay?: string;
  iterationCount?: string | number;
  easing?: StyleValue<'animationTimingFunction'>;
  direction?: StyleValue<'animationDirection'>;
  fillMode?: StyleValue<'animationFillMode'>;
  playState?: StyleValue<'animationPlayState'>;
}

type KeyframesProps = Keyframes & KeyframesConfig;

export const keyframes = ({ animationName: _name, params: _params, appendInitialStyles, ...keyframes }: KeyframesProps) => {
  const animationName = _name || toHash(keyframes);

  const fn = (params: KeyframesParams = {}) => {
    const {
      duration = '500ms',
      easing = 'ease-in-out',
      delay = '0s',
      iterationCount = '1',
      direction = 'normal',
      fillMode = 'forwards',
      playState = 'running',
    } = { ..._params, ...params };

    const animation = `${animationName} ${duration} ${easing} ${delay} ${iterationCount} ${direction} ${fillMode} ${playState}`;
    if (!appendInitialStyles) return animation;
    const startingFrom = keyframes.from || keyframes['0%'];
    if (!startingFrom) return animation;
    const startStyles = parseStyles(startingFrom, '');
    return `${animation};${startStyles}`;
  };

  const keyframesCss = Object.entries(keyframes).reduce((acc, [key, value]) => {
    if (!value) return acc;
    const styles = parseStyles(value, '');
    const keyStr = typeof key === 'number' ? `${key}%` : key;
    return `${acc}${keyStr}{${styles}}`;
  }, '');

  const css = `@keyframes ${animationName} {${keyframesCss}}`;

  Object.assign(fn, {
    toString: fn,
    isKeyframes: true,
    animationName,
    css,
    keyframes,
  });

  return fn;
};
