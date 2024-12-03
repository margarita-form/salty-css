import { AnchorHTMLAttributes, ReactNode, createElement } from 'react';
import { Link, useLocation } from 'react-router-dom';

export interface DynamicLinkProps<T extends HTMLElement = HTMLAnchorElement> extends AnchorHTMLAttributes<T> {
  element?: string;
  href?: string;
  children?: ReactNode;
  text?: string;
  className?: string;
}

export const DynamicLink = ({ element = 'span', href, children, className: _cl, text, target: _target, ...rest }: DynamicLinkProps) => {
  const { pathname } = useLocation();
  const el = href ? Link : element;
  const className = `dynamic-link ${_cl || ''} ${pathname === href ? 'active' : ''}`;
  const content = children || text;
  if (children && text) console.warn('DynamicLink: both children and text are provided, only children will be rendered');
  const target = _target || (href && href.startsWith('http') ? '_blank' : undefined);
  return createElement(el, { to: href, className, target, ...rest }, content);
};
