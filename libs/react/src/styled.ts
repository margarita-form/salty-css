import { AllHTMLAttributes, JSX, ReactNode } from 'react';
import { Tag, StyledComponentProps, CreateElementProps, VariantProps, ParentComponentProps, StyledParams, ValueProps, Merge } from '@salty-css/core/types';
import { StyleComponentGenerator } from '@salty-css/core/generator';
import { elementFactory } from './element-factory';

export const styled = <const PROPS extends StyledComponentProps, const TAG extends Tag<Required<PROPS>>, const STYLE_PARAMS extends StyledParams>(
  tagName: TAG,
  params: STYLE_PARAMS
) => {
  const generator = new StyleComponentGenerator(tagName, params);

  const fn = elementFactory(tagName, generator.cssClassName, generator.props, {
    'data-unoptimized-client-component': true,
  });

  Object.assign(fn, {
    generator,
  });

  type TagAttributes = TAG extends keyof JSX.IntrinsicElements ? JSX.IntrinsicElements[TAG] : TAG extends string ? AllHTMLAttributes<HTMLElement> : object;

  type Ref = TAG extends string ? { ref?: any } : object;

  type ComponentType = (
    props: CreateElementProps & Ref & Merge<ParentComponentProps<TAG> | VariantProps<STYLE_PARAMS>> & ValueProps & Omit<TagAttributes, keyof CreateElementProps>
  ) => ReactNode;

  return fn as unknown as ComponentType & string;
};
