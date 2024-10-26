import { createElement, ReactNode } from 'react';
import { clsx } from 'clsx';

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

export const elementBuilderClient = <T extends Props>(
  tagName: Tag<T>,
  _className: string,
  _callerName?: string,
  _element?: string
) => {
  const fn = ({
    extend = tagName,
    element = _element,
    children,
    className,
    inlineStyles,
    ...props
  }: T) => {
    const joined = clsx(_className, className);

    const extendsComponent = typeof extend === 'function';
    const type = extendsComponent ? extend : element || extend;

    return createElement(
      type,
      {
        element: extendsComponent ? element : undefined,
        className: joined,
        ...props,
      },
      children
    );
  };

  return fn;
};
