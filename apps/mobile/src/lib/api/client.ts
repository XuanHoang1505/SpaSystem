import { ApiClient } from '@spa/api-client';
import { useAuthStore } from '@/stores/authStore';

const AUTH_PATH = '/api/v1/auth/';

const urlOf = (input: RequestInfo | URL) =>
  typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

/**
 * The mobile ApiClient: bearer token from the session store and one refresh + retry when an authenticated request
 * gets 401. The refresh token travels in the body (no `X-Auth-Transport` header, BR-AUTH-21); `/auth/*` is never
 * retried, so refresh and logout cannot loop.
 */
export function createMobileApiClient(
  baseUrl: string,
  deps: { refresh: () => Promise<boolean> },
): ApiClient {
  const send: typeof fetch = (input, init) => globalThis.fetch(input, init);
  const fetcher: typeof fetch = async (input, init) => {
    const response = await send(input, init);
    if (
      response.status !== 401 ||
      urlOf(input).includes(AUTH_PATH) ||
      !new Headers(init?.headers).has('Authorization')
    )
      return response;
    if (!(await deps.refresh())) return response;
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${useAuthStore.getState().accessToken ?? ''}`);
    return send(input, { ...init, headers });
  };
  return new ApiClient(baseUrl, {
    fetch: fetcher,
    headers: (): Record<string, string> => {
      const token = useAuthStore.getState().accessToken;
      return token ? { Authorization: `Bearer ${token}` } : {};
    },
  });
}
