import type { AllHTMLAttributes, ReactNode } from 'react';
import type { StyleComponentGenerator } from '../generator';
import type { OrString } from './util-types';

export type CreateElementProps = {
  extend?: Tag<any>;
  children?: ReactNode;
  className?: string;
  element?: string;
  /** vks = Variant key set */
  _vks?: Set<string>;
};

export type StyledComponentProps = Record<string, unknown> & CreateElementProps;

type FnComponent<PROPS extends StyledComponentProps> = {
  (props: PROPS): ReactNode;
  generator?: StyleComponentGenerator;
};

export type Tag<PROPS extends StyledComponentProps> =
  | string
  | FnComponent<PROPS>;

//

export type CompoundVariant = { [key: PropertyKey]: any; css: CssStyles };

type InvalidVariantKeys = keyof AllHTMLAttributes<HTMLElement>;
type StyleKeys = keyof Required<AllHTMLAttributes<HTMLElement>>['style'];

export type StyleValue<K extends string> = K extends StyleKeys
  ? Required<AllHTMLAttributes<HTMLElement>>['style'][K]
  : never;

type VariantOptions = {
  [key in InvalidVariantKeys]?: never;
};

type Variants = {
  variants?: VariantOptions & { [key: PropertyKey]: { [key: string]: Styles } };
  defaultVariants?: { [key: PropertyKey]: any };
  compoundVariants?: CompoundVariant[];
};

type VariantPropValue<T> = T extends 'true' ? 'true' | true : T;

export type VariantProps<STYLES extends Styles> =
  STYLES['variants'] extends undefined
    ? {}
    : {
        [K in keyof STYLES['variants']]?:
          | VariantPropValue<keyof STYLES['variants'][K]>
          | '';
      };

export type ParentComponentProps<TAG extends Tag<any>> = TAG extends (
  props: infer P
) => ReactNode
  ? P
  : unknown;

type StylePropertyValue = Record<never, never> & unknown;

export type CssStyles = {
  [key in StyleKeys | OrString]?:
    | StyleValue<key>
    | StylePropertyValue
    | PropertyValueToken
    | CssStyles;
};

export type Styles = CssStyles & Variants;

export interface GeneratorOptions {
  className?: string;
  displayName?: string;
  element?: string;
}

//

export interface SaltyConfig {
  global?: Styles;
  templates?: Record<PropertyKey, any>;
  variables?: Record<PropertyKey, any>;
}
