import { describe, expect, it } from 'vitest';
import { devCanonicalUrl } from './devOrigin';

const at = (href: string) => {
  const url = new URL(href);
  return {
    hostname: url.hostname,
    origin: url.origin,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
  };
};
const lan = 'http://192.168.1.202:5173';

describe('devCanonicalUrl', () => {
  it('moves a localhost page to the LAN address, keeping path, query and hash', () => {
    expect(devCanonicalUrl(at('http://localhost:5173/my-orders?status=paid#top'), lan, true)).toBe(
      'http://192.168.1.202:5173/my-orders?status=paid#top',
    );
    expect(devCanonicalUrl(at('http://127.0.0.1:5173/'), lan, true)).toBe(`${lan}/`);
  });

  it('stays on the LAN address itself', () => {
    expect(devCanonicalUrl(at(`${lan}/cart`), lan, true)).toBeNull();
  });

  it('never moves outside dev, without an address, or on another host', () => {
    expect(devCanonicalUrl(at('http://localhost:5173/'), lan, false)).toBeNull();
    expect(devCanonicalUrl(at('http://localhost:5173/'), undefined, true)).toBeNull();
    expect(devCanonicalUrl(at('http://localhost:5173/'), 'not a url', true)).toBeNull();
    expect(devCanonicalUrl(at('http://spa.example.vn/'), lan, true)).toBeNull();
  });
});
