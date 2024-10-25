import { createElement, ReactNode } from 'react';
import { clsx } from 'clsx';
import { StyleComponentGenerator } from '../lib/generator';

type CreateElementProps = {
  as?: string;
  children?: ReactNode;
  className?: string;
  inlineStyles?: boolean;
};

type Props = Record<string, unknown> & CreateElementProps;

export const elementBuilder = <T extends Props>(
  generator: StyleComponentGenerator
) => {
  const fn = ({
    as = generator.tagName,
    children,
    className,
    inlineStyles,
    ...props
  }: T) => {
    const joined = clsx(generator.className, className);
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
