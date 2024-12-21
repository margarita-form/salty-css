import { AllHTMLAttributes, JSX, ReactNode } from 'react';
import { Tag, StyledComponentProps, CreateElementProps, VariantProps, ParentComponentProps, StyledParams, ValueProps } from '@salty-css/core/types';
import { StyleComponentGenerator } from '@salty-css/core/generator';
import { elementFactory } from './element-factory';

export const styled = <const PROPS extends StyledComponentProps, const TAG extends Tag<Required<PROPS>>, const STYLE_PARAMS extends StyledParams>(
  tagName: TAG,
  params: StyledParams
) => {
  const generator = new StyleComponentGenerator(tagName, params);

  const fn = elementFactory(tagName, generator.cssClassName, generator.props, {
    'data-unoptimized-client-component': true,
  });

  Object.assign(fn, {
    generator,
  });

  type TagAttributes = TAG extends keyof JSX.IntrinsicElements ? JSX.IntrinsicElements[TAG] : TAG extends string ? AllHTMLAttributes<HTMLElement> : never;

  type Ref = TAG extends string ? { ref: any } : never;

  type ComponentType = (props: (CreateElementProps & ParentComponentProps<TAG>) | Ref | VariantProps<STYLE_PARAMS> | ValueProps | TagAttributes) => ReactNode;

  return fn as unknown as ComponentType & string;
};
