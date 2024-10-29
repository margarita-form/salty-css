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
  _element?: string,
  _variantKeys?: string[]
) => {
  const fn = ({
    extend = tagName,
    element = _element,
    children,
    className,
    inlineStyles,
    ...props
  }: T) => {
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
    return createElement(
      type,
      {
        element: extendsComponent ? element : undefined,
        className: joinedClassNames,
        ...props,
      },
      children
    );
  };

  return fn;
};
