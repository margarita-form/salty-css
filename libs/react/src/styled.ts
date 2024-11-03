import { ReactNode } from 'react';
import {
  Tag,
  StyledComponentProps,
  Styles,
  GeneratorOptions,
  CreateElementProps,
  VariantProps,
  ParentComponentProps,
} from '@salty-css/core/types';
import { StyleComponentGenerator } from '@salty-css/core/generator';
import { elementFactory } from './element-factory';

export const styled = <
  const PROPS extends StyledComponentProps,
  const TAG extends Tag<Required<PROPS>>,
  const STYLES extends Styles
>(
  tagName: TAG,
  styles: STYLES,
  options: GeneratorOptions = {}
) => {
  const generator = new StyleComponentGenerator(tagName, styles, options);

  const fn = elementFactory(
    tagName,
    generator.cssClassName,
    generator.props.element,
    generator.props.variantKeys,
    { 'data-unoptimized-client-component': true }
  );

  Object.assign(fn, {
    generator,
  });

  type ComponentType = <T extends object>(
    props:
      | (T & CreateElementProps & ParentComponentProps<TAG>)
      | VariantProps<STYLES>
  ) => ReactNode;

  return fn as ComponentType & string;
};
