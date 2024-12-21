import type { GeneratorProps } from '@salty-css/core/generator';
import { createElement, ForwardedRef, forwardRef } from 'react';
import { clsx } from 'clsx';
import { StyledComponentProps, Tag } from '@salty-css/core/types';
import { dashCase } from '@salty-css/core/util';

const _styledKeys = ['passVariantProps'];

export const elementFactory = (tagName: Tag<any>, _className: string, _generatorProps: GeneratorProps, _additionalProps?: Record<PropertyKey, any>) => {
  const fn = (
    {
      extend = tagName,
      element = _generatorProps.element,
      className = '',
      children,
      passVariantProps,
      _vks = new Set<string>(),
      ...props
    }: StyledComponentProps,
    elementRef: ForwardedRef<any>
  ) => {
    const passedProps = { passVariantProps } as StyledComponentProps;
    if (_generatorProps.attr) Object.assign(passedProps, _generatorProps.attr);
    if (_additionalProps) Object.assign(passedProps, _additionalProps);
    if (props) Object.assign(passedProps, props);

    const additionalClasses = new Set<string>(className.split(' '));

    const extendsComponent = typeof extend === 'function' || typeof extend === 'object';
    const extendsStyled = extendsComponent && 'isStyled' in extend;
    const type = extendsComponent ? extend : element || extend;
    if (!type) throw new Error('No element provided');

    if (_generatorProps.propValueKeys) {
      if (!passedProps['style']) passedProps['style'] = {};
      _generatorProps.propValueKeys.forEach((key) => {
        const name = `css-${key}`;
        const value = props[name];
        if (value === undefined) return;
        const variableName = `--props-${dashCase(key)}`;
        passedProps['style'][variableName] = value;
        if (_vks) _vks.add(name);
      });
    }

    if (_generatorProps.variantKeys) {
      _generatorProps.variantKeys.forEach((key) => {
        const [name, defaultValue] = key.split('=');
        if (props[name] !== undefined) {
          additionalClasses.add(`${name}-${props[name]}`);
          if (_vks) _vks.add(name);
        } else if (defaultValue !== undefined) {
          additionalClasses.add(`${name}-${defaultValue}`);
        }
      });
    }

    const deleteVKS = !extendsComponent || !extendsStyled;
    if (_vks && deleteVKS) {
      _vks.forEach((vk) => {
        if (!passVariantProps) return delete passedProps[vk];
        if (passVariantProps === true) return;
        if (passVariantProps.includes(vk)) return;
        return delete passedProps[vk];
      });
    } else if (extendsStyled) Object.assign(passedProps, { _vks });

    if (!extendsStyled) _styledKeys.forEach((key) => delete passedProps[key]);
    const joinedClassNames = clsx(_className, ...additionalClasses);

    return createElement(
      type,
      {
        element: extendsComponent ? element : undefined,
        className: joinedClassNames,
        ref: elementRef,
        ...passedProps,
      },
      children
    );
  };

  const withRef = forwardRef(fn);

  Object.assign(withRef, {
    isStyled: true,
    className: _className,
    toString: () => `.${_className}`,
  });

  return withRef;
};
