import type * as CSS from 'csstype';
import type { ReactNode } from 'react';
import type { StyleComponentGenerator } from '../generator';
import type { NeverObj, OrAny, OrString } from './util-types';

export type CreateElementProps = {
  extend?: Tag<any>;
  children?: ReactNode;
  className?: string;
  element?: string;
  passProps?: boolean | string | string[];
  style?: CssProperties | { [key: string]: PropertyValueToken | NeverObj };
  /** vks = Variant key set */
  _vks?: Set<string>;
};

export type StyledComponentProps = Record<string, unknown> & CreateElementProps;

type FnComponent<PROPS extends StyledComponentProps> = {
  (props: OrAny | PROPS): ReactNode;
  generator?: StyleComponentGenerator;
};

export type Tag<PROPS extends StyledComponentProps> = OrString | keyof HTMLElementTagNameMap | FnComponent<PROPS>;

type CSSPropertyValueFunction = (params?: any) => any;

export type CssProperties = { [key in keyof CSS.Properties]: CSS.Properties[key] | PropertyValueToken | CSSPropertyValueFunction | NeverObj };
type CssPropertyKeys = keyof CssProperties;
export type StyleValue<K extends string> = K extends CssPropertyKeys ? CssProperties[K] : never;

type InvalidVariantKeys = '' | 'css';
type VariantOptions = {
  [key in InvalidVariantKeys]?: never;
};

export type CompoundVariant = { [key: PropertyKey]: string | boolean | undefined } | { css: CSSinJS };
type Variants = {
  variants?: VariantOptions & { [key: PropertyKey]: { [key: PropertyKey]: CSSinJS } };
  defaultVariants?: { [key: PropertyKey]: any };
  compoundVariants?: CompoundVariant[];
};

type BooleanVariantValue = 'true' | 'false' | boolean;
type VariantPropValue<T> = T extends 'true' ? BooleanVariantValue : T extends 'false' ? BooleanVariantValue : T extends boolean ? BooleanVariantValue : T | '';

type PickType<T, K extends AllKeys<T>> = T extends { [k in K]?: any } ? T[K] : undefined;
type AllKeys<T> = T extends any ? keyof T : never;
export type Merge<T> = { [k in AllKeys<T>]?: PickType<T, k> };

export type VariantProps<
  STYLES extends StyledParams,
  B = STYLES['variants'] extends undefined ? object : STYLES['variants'],
  C = STYLES['compoundVariants'] extends CompoundVariant[] ? Merge<STYLES['compoundVariants'][number]> : object
> = Merge<
  | {
      [K in keyof B]?: K extends 'css' ? never : VariantPropValue<keyof B[K]>;
    }
  | {
      [K in keyof C]?: K extends 'css' ? never : VariantPropValue<C[K]>;
    }
>;

type CssValuePropKey = `props-${string}`;

export type ValueProps = {
  [key: CssValuePropKey]: string;
};

export type ParentComponentProps<TAG extends Tag<any>> = TAG extends (props: infer P) => ReactNode ? P : object;

type StylePropertyValue = Record<never, never> & unknown;

export type CSSinJS = CssProperties | StylePropertyValue | TemplateTokens | CssPseudos;

export type CssStyles = {
  [key in OrString]?: CSSinJS;
};

export type Styles = CssStyles & Variants;

export interface GeneratorOptions {
  className?: string;
  displayName?: string;
  element?: string;
  passProps?: boolean | string | string[];
  defaultProps?: Record<PropertyKey, unknown>;
}

interface Base extends CssProperties, CssStyles, CssPseudos, TemplateTokens {}

type Pseudos = CSS.Pseudos | `&${CSS.Pseudos}`;
type CssPseudos = { [P in Pseudos]?: CssStyles };

export interface StyledParams extends GeneratorOptions, Variants {
  base?: Base;
}
