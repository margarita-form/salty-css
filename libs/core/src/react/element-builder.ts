import { createElement, ReactNode } from 'react';
import { clsx } from 'clsx';
import { StyleComponentGenerator, Styles } from '../lib/generator';

type CreateElementProps = {
  extend?: Tag<any>;
  children?: ReactNode;
  className?: string;
  inlineStyles?: boolean;
  element?: string;
};

export type Props = Record<string, unknown> & CreateElementProps;

type FnComponent<P extends Props> = (props: P) => ReactNode;

export type Tag<P extends Props> = string | FnComponent<P>;

export const elementBuilder = <
  const P extends Props,
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
    const joined = clsx(generator.cssClassName, className);

    const extendsComponent = typeof extend === 'function';
    const type = extendsComponent ? extend : element || extend;

    return createElement(
      type,
      {
        style: inlineStyles ? generator.styles : undefined,
        element: extendsComponent ? element : undefined,
        className: joined,
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
