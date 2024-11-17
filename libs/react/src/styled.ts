import { AllHTMLAttributes, HTMLAttributes, ReactDOM, ReactNode } from 'react';
import { Tag, StyledComponentProps, CreateElementProps, VariantProps, ParentComponentProps, StyledParams } from '@salty-css/core/types';
import { StyleComponentGenerator } from '@salty-css/core/generator';
import { elementFactory } from './element-factory';

export const styled = <const PROPS extends StyledComponentProps, const TAG extends Tag<Required<PROPS>>, const STYLE_PARAMS extends StyledParams>(
  tagName: TAG,
  params: STYLE_PARAMS
) => {
  const generator = new StyleComponentGenerator(tagName, params);

  const fn = elementFactory(tagName, generator.cssClassName, generator.props.element, generator.props.variantKeys, {
    'data-unoptimized-client-component': true,
  });

  Object.assign(fn, {
    generator,
  });

  type TagAttributes = TAG extends keyof ReactDOM
    ? ReactDOM[TAG] extends (...props: infer R) => any
      ? R[0]
      : TAG extends string
      ? AllHTMLAttributes<HTMLElement>
      : never
    : TAG extends string
    ? AllHTMLAttributes<HTMLElement>
    : never;

  type Ref = TAG extends string ? { ref: any } : never;

  type ComponentType = (props: (CreateElementProps & ParentComponentProps<TAG>) | Ref | VariantProps<STYLE_PARAMS> | TagAttributes) => ReactNode;

  return fn as unknown as ComponentType & string;
};
