import { createElement } from 'react';
import { clsx } from 'clsx';
import { StyledComponentProps, Tag } from '@salty-css/core/types';

const _styledKeys = ['passVariantProps'];

export const elementFactory = (
  tagName: Tag<any>,
  _className: string,
  _element?: string,
  _variantKeys?: string[],
  _additionalProps?: Record<PropertyKey, any>
) => {
  const fn = ({
    extend = tagName,
    element = _element,
    className = '',
    children,
    passVariantProps,
    _vks = new Set<string>(),
    ...props
  }: StyledComponentProps) => {
    const passedProps = { passVariantProps } as StyledComponentProps;
    if (props) Object.assign(passedProps, props);
    if (_additionalProps) Object.assign(passedProps, _additionalProps);

    const additionalClasses = new Set<string>(className.split(' '));

    const extendsComponent = typeof extend === 'function';
    const extendsStyled = extendsComponent && 'isStyled' in extend;
    const type = extendsComponent ? extend : element || extend;
    if (!type) throw new Error('No element provided');

    if (_variantKeys) {
      _variantKeys.forEach((key) => {
        const [name, defaultValue] = key.split('=');
        if (props[name] !== undefined) {
          additionalClasses.add(`${name}-${props[name]}`);
          if (!extendsComponent) delete passedProps[name];
          else if (_vks) _vks.add(name);
        } else if (defaultValue !== undefined) {
          additionalClasses.add(`${name}-${defaultValue}`);
        }
      });
    }

    const deleteVKS = !extendsComponent || (!extendsStyled && !passVariantProps);
    if (_vks && deleteVKS) _vks.forEach((vk) => delete passedProps[vk]);
    else if (extendsStyled) Object.assign(passedProps, { _vks });

    if (!extendsStyled) _styledKeys.forEach((key) => delete passedProps[key]);
    const joinedClassNames = clsx(_className, ...additionalClasses);

    return createElement(
      type,
      {
        element: extendsComponent ? element : undefined,
        className: joinedClassNames,
        ...passedProps,
      },
      children
    );
  };

  Object.assign(fn, {
    isStyled: true,
    className: _className,
    toString: () => `.${_className}`,
  });

  return fn;
};
