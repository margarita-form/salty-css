import { createElement } from 'react';

interface DynamicLinkProps {
  href?: string;
  children: React.ReactNode;
  className?: string;
  element?: string;
}

export const DynamicLink = ({
  href,
  children,
  className,
  element,
  ...rest
}: DynamicLinkProps) => {
  if (!href)
    return createElement(element || 'span', { className, ...rest }, children);

  return (
    <a href={href} target="_blank" className={className} {...rest}>
      {children}
    </a>
  );
};
