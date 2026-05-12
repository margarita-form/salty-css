/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseStyles } from '@salty-css/core/types';
import { getDynamicStylesClassName, getDynamicStylesCss } from '@salty-css/core/css/dynamic-styles';
import clsx from 'clsx';
import { createElement, HTMLAttributes } from 'react';

export { getDynamicStylesClassName, getDynamicStylesCss };

type AnyComponent = (...args: any[]) => React.ReactNode;

interface DynamicStylesProps extends HTMLAttributes<HTMLElement> {
  styles?: BaseStyles;
  scope?: string;
  as?: string | AnyComponent;
}

/**
 * Add any dynamic styles to your app with a custom scope.
 * Note: this works only with server components.
 */
export const DynamicStyles = async ({ as, scope, styles, ...rest }: DynamicStylesProps) => {
  if (as) {
    const Component = (props: any) => (typeof as === 'string' ? createElement(as, props) : as(props));
    if (!styles) return <Component {...rest} />;
    const className = getDynamicStylesClassName(styles);
    const css = await getDynamicStylesCss(styles, scope || `.${className}`);
    const props = { ...rest, className: clsx(className, rest.className) };
    return (
      <>
        <style>{css}</style>
        <Component {...props} />
      </>
    );
  }
  if (!styles) return null;
  const css = await getDynamicStylesCss(styles, scope);
  return <style>{css}</style>;
};
