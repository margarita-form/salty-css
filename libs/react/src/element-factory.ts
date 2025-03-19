import { createElement, ForwardedRef, forwardRef } from 'react';
import { clsx } from 'clsx';
import { StyledComponentProps, Tag } from '@salty-css/core/types';
import { dashCase } from '@salty-css/core/util';
import { parseVariableTokens } from '@salty-css/core/parsers/parse-tokens';
import { StyledGeneratorClientProps } from '@salty-css/core/generators';
import { CommonRecord } from '@salty-css/core/types/util-types';

const _styledKeys = ['passProps'];

export const elementFactory = (
  tagName: Tag<any>,
  _className = '',
  _generatorProps: StyledGeneratorClientProps = {},
  _additionalProps?: Record<PropertyKey, any>
) => {
  const fn = (
    {
      extend = tagName,
      element = _generatorProps.element,
      className = '',
      children,
      passProps = _generatorProps.passProps,
      _vks = new Set<string>(),
      ...props
    }: StyledComponentProps,
    elementRef: ForwardedRef<any>
  ) => {
    const passedProps = { passProps } as StyledComponentProps;
    if (_generatorProps.attr) Object.assign(passedProps, _generatorProps.attr);
    if (_additionalProps) Object.assign(passedProps, _additionalProps);
    if (_generatorProps.defaultProps) Object.assign(props, _generatorProps.defaultProps);
    if (props) Object.assign(passedProps, props);

    const uniqueClasses = new Set<string>([..._className.split(' '), ...className.split(' ')]);

    const extendsComponent = typeof extend === 'function' || typeof extend === 'object';
    const extendsStyled = extendsComponent && 'isStyled' in extend;
    const type = extendsComponent ? extend : element || extend;
    if (!type) throw new Error('No element provided');

    const styles: CommonRecord = passedProps['style'] || {};
    if (!passedProps['style']) passedProps['style'] = styles;

    Object.entries(styles).forEach(([key, value]) => {
      const result = parseVariableTokens(value);
      if (result) styles[key] = result.transformed;
    });

    if (_generatorProps.propValueKeys) {
      _generatorProps.propValueKeys.forEach((key) => {
        const name = `css-${key}`;
        const value = props[name];
        if (value === undefined) return;
        const variableName = `--props-${dashCase(key)}`;
        styles[variableName] = value;
        if (_vks) _vks.add(name);
      });
    }

    if (_generatorProps.variantKeys) {
      _generatorProps.variantKeys.forEach((key) => {
        const [name, defaultValue] = key.split('=');
        if (props[name] !== undefined) {
          uniqueClasses.add(`${name}-${props[name]}`);
          if (_vks) _vks.add(name);
        } else if (defaultValue !== undefined) {
          uniqueClasses.add(`${name}-${defaultValue}`);
        }
      });
    }

    const deleteVKS = !extendsComponent || !extendsStyled;
    if (_vks && deleteVKS) {
      _vks.forEach((vk) => {
        if (!passProps) return delete passedProps[vk];
        if (passProps === true) return;
        if (passProps.includes(vk)) return;
        return delete passedProps[vk];
      });
    } else if (extendsStyled) Object.assign(passedProps, { _vks });

    if (!extendsStyled) _styledKeys.forEach((key) => delete passedProps[key]);
    const joinedClassNames = clsx(...uniqueClasses);

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
