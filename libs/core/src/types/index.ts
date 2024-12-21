import type * as CSS from 'csstype';
import type { ReactNode } from 'react';
import type { StyleComponentGenerator } from '../generator';
import type { OrAny, OrString } from './util-types';

export type CreateElementProps = {
  extend?: Tag<any>;
  children?: ReactNode;
  className?: string;
  element?: string;
  passVariantProps?: boolean | string | string[];
  style?: CssProperties & { [key: string]: OrAny | PropertyValueToken };
  /** vks = Variant key set */
  _vks?: Set<string>;
};

export type StyledComponentProps = Record<string, unknown> & CreateElementProps;

type FnComponent<PROPS extends StyledComponentProps> = {
  (props: OrAny | PROPS): ReactNode;
  generator?: StyleComponentGenerator;
};

export type Tag<PROPS extends StyledComponentProps> = OrString | keyof HTMLElementTagNameMap | FnComponent<PROPS>;

type CssProperties = { [key in keyof CSS.Properties]: CSS.Properties[key] | PropertyValueToken };
type CssPropertyKeys = keyof CssProperties;
export type StyleValue<K extends string> = K extends CssPropertyKeys ? CssProperties[K] : never;

type InvalidVariantKeys = '';
type VariantOptions = {
  [key in InvalidVariantKeys]?: never;
};

export type CompoundVariant = { [key: PropertyKey]: any; css: CssStyles };
type Variants = {
  variants?: VariantOptions & { [key: PropertyKey]: { [key: string]: Styles } };
  defaultVariants?: { [key: PropertyKey]: any };
  compoundVariants?: CompoundVariant[];
};

type BooleanVariantValue = 'true' | 'false' | boolean;
type VariantPropValue<T> = T extends 'true' ? BooleanVariantValue : T extends 'false' ? BooleanVariantValue : T;

export type VariantProps<STYLES extends StyledParams> = STYLES['variants'] extends undefined
  ? object
  : {
      [K in keyof STYLES['variants']]?: VariantPropValue<keyof STYLES['variants'][K]> | '';
    };

type CssValuePropKey = `props-${string}`;

export type ValueProps = {
  [key: CssValuePropKey]: string;
};

export type ParentComponentProps<TAG extends Tag<any>> = TAG extends (props: infer P) => ReactNode ? P : unknown;

type StylePropertyValue = Record<never, never> & unknown;

export type CssStyles = {
  [key in OrString]?: CssProperties | StylePropertyValue | PropertyValueToken | CssStyles;
};

export type Styles = CssStyles & Variants;

export interface GeneratorOptions {
  className?: string;
  displayName?: string;
  element?: string;
}

interface Base extends CssProperties, CssStyles, CssPseudos {}

type Pseudos = CSS.Pseudos | `&${CSS.Pseudos}`;
type CssPseudos = { [P in Pseudos]?: Base };

export interface StyledParams extends GeneratorOptions, Variants {
  base?: Base;
}
