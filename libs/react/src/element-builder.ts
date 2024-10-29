import { createElement, ReactNode } from 'react';
import { StyleComponentGenerator } from '@salty-css/core/generator';
import {
  Tag,
  StyledComponentProps,
  Styles,
  CreateElementProps,
} from '@salty-css/core/types';
import { clsx } from 'clsx';

export const elementBuilder = <
  const P extends StyledComponentProps,
  const T extends Tag<P>,
  const S extends Styles
>(
  tagName: T,
  styles: S,
  generator: StyleComponentGenerator
) => {
  const fn = ({
    extend = tagName,
    element = generator.props.element,
    children,
    className,
    inlineStyles,
    ...props
  }: P) => {
    const additionalClasses: string[] = [];

    const extendsComponent = typeof extend === 'function';
    const type = extendsComponent ? extend : element || extend;
    if (!type) throw new Error('No element provided');

    const { variantKeys } = generator.props;
    if (variantKeys) {
      variantKeys.forEach((key) => {
        const [name, defaultValue] = key.split('=');
        if (props[name] !== undefined) {
          additionalClasses.push(`${name}-${props[name]}`);
          if (!extendsComponent) delete props[name];
        } else if (defaultValue !== undefined) {
          additionalClasses.push(`${name}-${defaultValue}`);
        }
      });
    }

    const joinedClassNames = clsx(
      generator.cssClassName,
      className,
      additionalClasses
    );

    return createElement(
      type,
      {
        'data-client': true,
        element: extendsComponent ? element : undefined,
        className: joinedClassNames,
        ...props,
      },
      children
    );
  };

  Object.assign(fn, {
    generator,
    className: `.${generator.cssClassName}`,
    toString: () => `.${generator.cssClassName}`,
  });

  type _V = (typeof styles)['variants'];
  type VariantValue<T> = T extends 'true' ? 'true' | true : T;
  type Variants = _V extends undefined
    ? {}
    : { [K in keyof _V]?: VariantValue<keyof _V[K]> | '' };

  type ComponentType = <T extends object>(
    props: T & CreateElementProps & Variants
  ) => ReactNode;

  return fn as ComponentType;
};
