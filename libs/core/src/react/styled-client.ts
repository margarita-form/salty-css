import { elementBuilderClient, Props, Tag } from './element-builder-client';

export const styledClient = <P extends Props>(
  tagName: Tag<P>,
  className: string,
  callerName?: string,
  element?: string
) => {
  return elementBuilderClient(tagName, className, callerName, element);
};
