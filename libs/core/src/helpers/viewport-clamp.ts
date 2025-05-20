interface ViewportClampConfig {
  screenSize: number;
  axis?: 'vertical' | 'horizontal';
  minMultiplier?: number;
  maxMultiplier?: number;
  minMaxUnit?: string;
}

export const defineViewportClamp = (config: ViewportClampConfig) => (value: number, min?: number | undefined, max?: number | undefined) => {
  const { screenSize, axis = 'horizontal', minMultiplier = 0.5, maxMultiplier = 1.5, minMaxUnit = 'px' } = config;

  const relativeValue = Math.round((value / screenSize) * 10000) / 100;
  const relativeUnit = axis === 'vertical' ? 'vh' : 'vw';

  const minValue = min || Math.round(minMultiplier * value);
  const maxValue = max || Math.round(maxMultiplier * value);

  return `clamp(${minValue}${minMaxUnit}, ${relativeValue}${relativeUnit}, ${maxValue}${minMaxUnit})`;
};
