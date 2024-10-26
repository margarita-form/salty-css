import { createElement, ReactNode } from 'react';
import { clsx } from 'clsx';
import { StyleComponentGenerator } from '../lib/generator';

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

export const elementBuilder = <T extends Props>(
  tagName: Tag<T>,
  generator: StyleComponentGenerator
) => {
  const fn = ({
    extend = tagName,
    element = generator.props.element,
    children,
    className,
    inlineStyles,
    ...props
  }: T) => {
    const joined = clsx(generator.className, className);

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

  Object.assign(fn, { generator });
  return fn;
};
