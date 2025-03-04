/* eslint-disable @typescript-eslint/no-explicit-any */
import { StylesGenerator } from './styles-generator';
import { StyledParams, Tag } from '../types';

export interface StyledGeneratorClientProps {
  element?: string;
  variantKeys?: string[];
  propValueKeys?: string[];
  passProps?: boolean | string | string[];
  defaultProps?: Record<PropertyKey, unknown>;
  attr: {
    [key: string]: any;
  };
}

export class StyledGenerator<const STYLE_PARAMS extends StyledParams = StyledParams> extends StylesGenerator<STYLE_PARAMS> {
  constructor(public tagName: Tag<any>, public _params: STYLE_PARAMS) {
    super(_params);
  }

  get priority(): number {
    if (typeof this.tagName === 'function' || typeof this.tagName === 'object') {
      const prev = this.tagName.generator?.priority || 0;
      return prev + 1;
    }
    return 0;
  }

  get clientProps(): StyledGeneratorClientProps {
    const { element, variants = {}, compoundVariants = [], defaultVariants = {}, defaultProps = {}, passProps } = this.params;
    const { callerName, isProduction } = this.buildContext;

    const variantKeys = new Set<string>([]);

    const addVariantKey = (name: string) => {
      const defaultVariant = defaultVariants[name];
      if (defaultVariant !== undefined) variantKeys.add(`${name}=${String(defaultVariant)}`);
      else variantKeys.add(name);
    };

    Object.keys(variants).forEach(addVariantKey);
    compoundVariants.map((cv) => Object.keys(cv).forEach(addVariantKey));

    const propValueKeys = new Set<string>([]);

    if (this.params.base) {
      const matches = JSON.stringify(this.params.base).match(/\{props\.([\w\d]+)\}/gi);
      if (matches) {
        matches.forEach((match) => {
          const value = match.replace(/\{props\.([\w\d]+)\}/gi, '$1');
          if (value) propValueKeys.add(value);
        });
      }
    }

    return {
      element,
      variantKeys: [...variantKeys],
      propValueKeys: [...propValueKeys],
      passProps,
      defaultProps,
      attr: {
        'data-component-name': !isProduction ? callerName : undefined,
      },
    };
  }
}
