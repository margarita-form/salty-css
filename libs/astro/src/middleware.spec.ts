import { describe, expect, it } from 'vitest';
import { CSS_COLLECTOR_PLACEHOLDER, onRequest, SaltyLocals } from './middleware';

// Runs the middleware with a fake render that registers urls into locals like the .astro wrappers do.
const run = async (body: string, contentType = 'text/html; charset=utf-8', urls: string[] = []) => {
  const context = { locals: {} as SaltyLocals };
  const next = async () => {
    urls.forEach((url) => context.locals.cssUrls?.add(url));
    return new Response(body, { status: 200, headers: { 'content-type': contentType, 'content-length': String(body.length) } });
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = (await onRequest(context as any, next as any)) as Response;
  return { response, context };
};

describe('css collector middleware', () => {
  it('initialises locals', async () => {
    const { context } = await run('<html></html>');
    expect(context.locals.cssUrls).toBeInstanceOf(Set);
    expect(context.locals.saltyCssCollector).toBe(true);
  });

  it('replaces the placeholder with collected link tags', async () => {
    const html = `<html><head>${CSS_COLLECTOR_PLACEHOLDER}</head><body></body></html>`;
    const { response } = await run(html, undefined, ['/a.css', '/b.css', '/a.css']);
    const text = await response.text();

    expect(text).toBe('<html><head><link rel="stylesheet" href="/a.css"><link rel="stylesheet" href="/b.css"></head><body></body></html>');
    expect(response.headers.get('content-length')).toBeNull();
    expect(response.status).toBe(200);
  });

  it('keeps html without placeholder as is', async () => {
    const { response } = await run('<html><body></body></html>', undefined, ['/a.css']);
    expect(await response.text()).toBe('<html><body></body></html>');
  });

  it('passes non-html responses through untouched', async () => {
    const body = `{"value":"${CSS_COLLECTOR_PLACEHOLDER}"}`;
    const { response } = await run(body, 'application/json', ['/a.css']);
    expect(await response.text()).toBe(body);
    expect(response.headers.get('content-length')).toBe(String(body.length));
  });
});
