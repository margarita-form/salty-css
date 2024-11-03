import type { ReactNode } from 'react';
import type { StyleComponentGenerator } from '../generator';

export type CreateElementProps = {
  extend?: Tag<any>;
  children?: ReactNode;
  className?: string;
  inlineStyles?: boolean;
  element?: string;
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

export type CompoundVariant = { [key: PropertyKey]: any; css: Styles };

type Variants = {
  variants?: { [key: PropertyKey]: { [key: PropertyKey]: Styles } };
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

export type ParentComponentProps<TAG extends Tag<any>> =
  TAG extends FnComponent<infer P> ? P : unknown;

type StylePropertyValue = Record<never, never> & unknown;

interface CssStyles {
  [key: string]: StylePropertyValue | PropertyValueToken | CssStyles;
}

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
