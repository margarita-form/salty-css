import { SaltyConfig } from '../config';
import { defineViewportClamp } from '../helpers/viewport-clamp';

const pxProperties: (string | RegExp)[] = [
  'top',
  'right',
  'bottom',
  'left',
  'min-width',
  /.*width.*/,
  /^[^line]*height.*/, // Exclude line-height
  /padding.*/,
  /margin.*/,
  /border.*/,
  /inset.*/,
  /.*radius.*/,
  /.*spacing.*/,
  /.*gap.*/,
  /.*indent.*/,
  /.*offset.*/,
  /.*size.*/,
  /.*thickness.*/,
  /.*font-size.*/,
];

/**
 * Add unit to a number value based on property name
 * @param key - The property name
 * @param value - The value to add unit to
 */
export const addUnit = (key: string, value: string | number, config?: SaltyConfig): string => {
  const isPxProperty = pxProperties.some((pxProperty) => {
    return typeof pxProperty === 'string' ? pxProperty === key : pxProperty.test(key);
  });

  if (isPxProperty) {
    const unit = config?.defaultUnit || 'px';
    const isClamp = unit.startsWith('viewport-clamp:');
    if (isClamp) {
      try {
        const screenSize = unit.split(':')[1];
        const viewportClamp = defineViewportClamp({
          screenSize: parseInt(screenSize),
        });
        return viewportClamp(Number(value));
      } catch (error) {
        console.error(error);
        throw new Error(`Invalid viewport-clamp value: ${unit}`);
      }
    }
    return `${value}${unit}`;
  }
  return `${value}`;
};
