/* eslint-disable @typescript-eslint/no-explicit-any */
import { StylesGenerator } from './styles-generator';
import { StyledParams, Tag } from '../types';
import { dashCase } from '../util';

export interface StyledGeneratorClientProps {
  element?: string;
  hash?: string;
  variantKeys?: string[];
  propValueKeys?: string[];
  passProps?: boolean | string | string[];
  defaultProps?: Record<PropertyKey, unknown>;
  attr?: {
    [key: string]: any;
  };
}

export class StyledGenerator<const STYLE_PARAMS extends StyledParams = StyledParams> extends StylesGenerator<STYLE_PARAMS> {
  constructor(public tagName: Tag<any>, public _params: STYLE_PARAMS) {
    super(_params);
  }

  override get priority(): number {
    if (this.params.priority) return this.params.priority;
    if (typeof this.tagName === 'function' || typeof this.tagName === 'object') {
      const prev = this.tagName.generator?.priority || 0;
      return prev + 1;
    }
    return 0;
  }

  get clientProps(): StyledGeneratorClientProps {
    const { element, variants = {}, compoundVariants = [], anyOfVariants = [], defaultVariants = {}, defaultProps = {}, passProps } = this.params;
    const { callerName, isProduction } = this.buildContext;

    const variantKeys = new Set<string>([]);

    const addVariantKey = (name: string) => {
      const defaultVariant = defaultVariants[name];
      if (defaultVariant !== undefined) variantKeys.add(`${name}=${String(defaultVariant)}`);
      else variantKeys.add(name);
    };

    Object.keys(variants).forEach(addVariantKey);
    compoundVariants.map((cv) => Object.keys(cv).forEach(addVariantKey));
    anyOfVariants.map((cv) => Object.keys(cv).forEach(addVariantKey));

    const propValueKeys = new Set<string>([]);

    if (this.params.base) {
      const matches = JSON.stringify(this.params.base).match(/\{-?props\.([^}]+)\}/gi);
      if (matches) {
        matches.forEach((match) => {
          const value = match.replace(/\{(?:-)?props\.([^}]+)\}/gi, '$1');
          const dashed = dashCase(value);
          if (value) propValueKeys.add(dashed);
        });
      }
    }

    return {
      element,
      hash: this.hash,
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
