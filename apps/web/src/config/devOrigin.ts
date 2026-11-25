const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * `npm run dev` sends the payment gateway back to the LAN address it printed, and the session cookie belongs to one
 * host, so a page opened on localhost would come back from VNPay signed out. In dev only, a loopback page moves to that
 * address (same path, query and hash) before the app starts. Returns the URL to go to, or null to stay.
 */
export function devCanonicalUrl(
  location: Pick<Location, 'hostname' | 'origin' | 'pathname' | 'search' | 'hash'>,
  canonicalOrigin: string | undefined,
  isDev: boolean,
): string | null {
  if (!isDev || !canonicalOrigin) return null;
  let canonical: URL;
  try {
    canonical = new URL(canonicalOrigin);
  } catch {
    return null;
  }
  if (canonical.origin === location.origin || !loopbackHosts.has(location.hostname)) return null;
  return `${canonical.origin}${location.pathname}${location.search}${location.hash}`;
}
