import { createElement } from 'react';
import { clsx } from 'clsx';
import { StyledComponentProps, Tag } from '@salty-css/core/types';

export const elementFactory = (
  tagName: Tag<any>,
  _className: string,
  _element?: string,
  _variantKeys?: string[],
  _additionalProps?: Record<PropertyKey, any>
) => {
  return ({
    extend = tagName,
    element = _element,
    children,
    className,
    inlineStyles,
    ...props
  }: StyledComponentProps) => {
    const additionalClasses: string[] = [];

    const extendsComponent = typeof extend === 'function';
    const type = extendsComponent ? extend : element || extend;
    if (!type) throw new Error('No element provided');

    if (_variantKeys) {
      _variantKeys.forEach((key) => {
        const [name, defaultValue] = key.split('=');
        if (props[name] !== undefined) {
          additionalClasses.push(`${name}-${props[name]}`);
          if (!extendsComponent) delete props[name];
        } else if (defaultValue !== undefined) {
          additionalClasses.push(`${name}-${defaultValue}`);
        }
      });
    }

    const joinedClassNames = clsx(_className, className, additionalClasses);
    const rest = _additionalProps ? { ..._additionalProps, ...props } : props;
    return createElement(
      type,
      {
        element: extendsComponent ? element : undefined,
        className: joinedClassNames,
        ...rest,
      },
      children
    );
  };
};
