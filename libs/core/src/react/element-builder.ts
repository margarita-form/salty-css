import { createElement, ReactNode } from 'react';
import { clsx } from 'clsx';
import { StyleComponentGenerator } from '../lib/generator';

type CreateElementProps = {
  as?: Tag<any>;
  children?: ReactNode;
  className?: string;
  inlineStyles?: boolean;
};

export type Props = Record<string, unknown> & CreateElementProps;

type FnComponent<P extends Props> = (props: P) => ReactNode;

export type Tag<P extends Props> = string | FnComponent<P>;

export const elementBuilder = <T extends Props>(
  tagName: Tag<T>,
  generator: StyleComponentGenerator
) => {
  const fn = ({
    as = tagName,
    children,
    className,
    inlineStyles,
    ...props
  }: T) => {
    const joined = clsx(generator.className, className);

    console.log(as);

    return createElement(
      as,
      {
        style: inlineStyles ? generator.styles : undefined,
        className: joined,
        ...props,
      },
      children
    );
  };

  Object.assign(fn, { generator });
  return fn;
};
