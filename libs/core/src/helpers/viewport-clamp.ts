interface ViewportClampConfig {
  screenSize: number;
  axis?: 'vertical' | 'horizontal';
  minMultiplier?: number;
  maxMultiplier?: number;
}

export const defineViewportClamp = (config: ViewportClampConfig) => (value: number) => {
  const { screenSize, axis = 'horizontal', minMultiplier = 0.5, maxMultiplier = 1.5 } = config;

  const relativeValue = Math.round((value / screenSize) * 10000) / 100;
  const relativeUnit = axis === 'vertical' ? 'vh' : 'vw';

  const minValue = Math.round(minMultiplier * value);
  const maxValue = Math.round(maxMultiplier * value);

  return `clamp(${minValue}px, ${relativeValue}${relativeUnit}, ${maxValue}px)`;
};
