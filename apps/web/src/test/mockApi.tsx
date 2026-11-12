import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { vi } from 'vitest';
import type { AuthResult, UserRole } from '@spa/shared-types';
import { AppProviders } from '@app/providers';
import { routeObjects } from '@app/router';

type Handler = (init: RequestInit | undefined, url: URL) => Response | Promise<Response>;

const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status });

export const envelope = (data: unknown, status = 200) =>
  json({ success: true, message: null, data, errors: [], traceId: 't' }, status);

export const apiError = (status: number, code: string, message: string, field?: string) =>
  json(
    { success: false, message, data: null, errors: [{ code, message, field }], traceId: 't' },
    status,
  );

export const authResult = (role: UserRole = 'owner'): AuthResult => ({
  accessToken: 'access',
  accessTokenExpiresAtUtc: '2026-11-05T10:15:00Z',
  refreshToken: null,
  refreshTokenExpiresAtUtc: null,
  user: { id: 'u1', fullName: 'Nguyễn Thị Lan', email: 'lan@spa.vn', role },
});

/**
 * Stubs `fetch` with handlers keyed "METHOD /path". Anything unmatched (including the start-up
 * `/auth/refresh`) answers 401, so the visitor stays anonymous.
 */
export function mockApi(handlers: Record<string, Handler> = {}) {
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example');
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
    );
    const handler = handlers[`${init?.method ?? 'GET'} ${url.pathname}`];
    return handler
      ? handler(init, url)
      : apiError(401, 'invalid_refresh_token', 'Phiên đăng nhập đã hết hạn.');
  });
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

export const callsTo = (fetcher: ReturnType<typeof mockApi>, path: string) =>
  fetcher.mock.calls.filter(([input]) => String(input).endsWith(path));

/** The whole app (providers + real routes) at a path, with optional history state. */
export function renderApp(path: string, state?: unknown) {
  const url = new URL(path, 'https://web.test');
  const router = createMemoryRouter(routeObjects, {
    initialEntries: [{ pathname: url.pathname, search: url.search, state }],
  });
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return router;
}
