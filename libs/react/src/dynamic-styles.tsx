/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseStyles } from '@salty-css/core/types';
import {
  DynamicStylesHelpers,
  getDynamicStylesClassName,
  getDynamicStylesCss,
  initializeDynamicStyles as initializeCoreDynamicStyles,
  InitializeDynamicStylesOptions,
} from '@salty-css/core/css/dynamic-styles';
import clsx from 'clsx';
import { createElement, HTMLAttributes } from 'react';

export { getDynamicStylesClassName, getDynamicStylesCss, type InitializeDynamicStylesOptions };

type AnyComponent = (...args: any[]) => React.ReactNode;

interface DynamicStylesProps extends HTMLAttributes<HTMLElement> {
  styles?: BaseStyles;
  scope?: string;
  as?: string | AnyComponent;
}

const createDynamicStylesComponent = (helpers: DynamicStylesHelpers) => {
  const DynamicStyles = async ({ as, scope, styles, ...rest }: DynamicStylesProps) => {
    if (as) {
      const Component = (props: any) => (typeof as === 'string' ? createElement(as, props) : as(props));
      if (!styles) return <Component {...rest} />;
      const className = helpers.getDynamicStylesClassName(styles);
      const css = await helpers.getDynamicStylesCss(styles, scope || `.${className}`);
      const props = { ...rest, className: clsx(className, rest.className) };
      return (
        <>
          <style>{css}</style>
          <Component {...props} />
        </>
      );
    }
    if (!styles) return null;
    const css = await helpers.getDynamicStylesCss(styles, scope);
    return <style>{css}</style>;
  };
  return DynamicStyles;
};

export interface DynamicStylesBundle extends DynamicStylesHelpers {
  DynamicStyles: ReturnType<typeof createDynamicStylesComponent>;
}

/**
 * Bind `DynamicStyles` and its helpers to a specific config / cache location.
 *
 * Use this in production deployments where the build-time `saltygen/` directory is
 * not present at runtime (e.g. an Astro site deployed to Cloudflare). Call once at
 * app startup and re-export the returned `DynamicStyles` component.
 *
 * @example
 *   export const { DynamicStyles } = initializeDynamicStyles({
 *     configCachePath: 'dist/saltygen/cache/config-cache.json',
 *   });
 */
export const initializeDynamicStyles = (options: InitializeDynamicStylesOptions = {}): DynamicStylesBundle => {
  const helpers = initializeCoreDynamicStyles(options);
  return {
    ...helpers,
    DynamicStyles: createDynamicStylesComponent(helpers),
  };
};

const defaults = initializeDynamicStyles();

/**
 * Add any dynamic styles to your app with a custom scope.
 * Note: this works only with server components.
 *
 * For production deployments where the `saltygen/` directory is stripped,
 * call {@link initializeDynamicStyles} instead and re-export its `DynamicStyles`.
 */
export const DynamicStyles = defaults.DynamicStyles;
