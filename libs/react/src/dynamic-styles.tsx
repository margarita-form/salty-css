/* eslint-disable @typescript-eslint/no-explicit-any */
import { parseStyles } from '@salty-css/core/parsers';
import { BaseStyles } from '@salty-css/core/types';
import { resolveDynamicConfigCache } from '@salty-css/core/cache/resolve-dynamic-config-cache';
import { toHash } from '@salty-css/core/util';
import clsx from 'clsx';
import { createElement, HTMLAttributes } from 'react';

/**
 * Create a hash of the dynamic styles that then can be used as scope.
 */
export const getDynamicStylesClassName = (styles: BaseStyles) => {
  return toHash(styles);
};

/**
 * Add any dynamic styles to your app with a custom scope.
 * Note: this works only with server components.
 */
export const getDynamicStylesCss = async (styles: BaseStyles, scope?: string) => {
  const config = await resolveDynamicConfigCache();
  const parsed = await parseStyles(styles, scope, config);
  return parsed.join('\n');
};

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
