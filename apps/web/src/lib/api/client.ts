import { ApiClient } from '@spa/api-client';
import { useAuthStore } from '@/stores/authStore';

/** Tells the API to keep the refresh token in the HttpOnly cookie (docs/specs/auth.md, BR-AUTH-21). */
export const AUTH_TRANSPORT_HEADER = 'X-Auth-Transport';

const AUTH_PATH = '/api/v1/auth/';

const urlOf = (input: RequestInfo | URL) =>
  typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

/**
 * The web's ApiClient: cookie transport, credentials, bearer token from the session store, and one refresh + retry
 * when an authenticated request gets 401. `/auth/*` is never retried, so logout and refresh cannot loop.
 */
export function createWebApiClient(
  baseUrl: string,
  deps: { fetch?: typeof fetch; refresh: () => Promise<boolean> },
): ApiClient {
  const send: typeof fetch = (input, init) => (deps.fetch ?? globalThis.fetch)(input, init);
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
    credentials: 'include',
    headers: () => {
      const token = useAuthStore.getState().accessToken;
      return {
        [AUTH_TRANSPORT_HEADER]: 'cookie',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
    },
  });
}
