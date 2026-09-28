import type { MiddlewareHandler } from 'astro';

/** Marker rendered by <CssCollector /> and replaced with the collected <link> tags after render. */
export const CSS_COLLECTOR_PLACEHOLDER = '<!--salty-css-collector-->';

export interface SaltyLocals {
  cssUrls?: Set<string>;
  saltyCssCollector?: boolean;
}

const toLinkTags = (urls: Iterable<string>) =>
  [...urls].map((href) => `<link rel="stylesheet" href="${href.replace(/"/g, '&quot;')}">`).join('');

/**
 * Astro middleware that collects CSS urls of rendered Salty components into `locals.cssUrls`
 * and injects them where <CssCollector /> was placed. Buffers the HTML response.
 */
export const onRequest: MiddlewareHandler = async (context, next) => {
  const locals = context.locals as SaltyLocals;
  const cssUrls = (locals.cssUrls = new Set<string>());
  locals.saltyCssCollector = true;

  const response = await next();
  if (!response.headers.get('content-type')?.includes('text/html')) return response;

  const html = await response.text();
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  const init = { status: response.status, statusText: response.statusText, headers };

  if (!html.includes(CSS_COLLECTOR_PLACEHOLDER)) return new Response(html, init);
  return new Response(html.replace(CSS_COLLECTOR_PLACEHOLDER, toLinkTags(cssUrls)), init);
};

export default onRequest;
