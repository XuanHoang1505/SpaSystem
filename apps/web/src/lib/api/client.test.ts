import { beforeEach, expect, test, vi } from 'vitest';
import { ApiClientError } from '@spa/api-client';
import { useAuthStore } from '@/stores/authStore';
import { AUTH_TRANSPORT_HEADER, createWebApiClient } from './client';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const unauthorized = () =>
  json({ success: false, errors: [{ code: 'unauthorized', message: 'Vui lòng đăng nhập.' }] }, 401);

function signIn(token = 'old') {
  useAuthStore.setState({ status: 'authenticated', accessToken: token, user: null });
}

const headersOf = (call: Parameters<typeof fetch> | undefined) => new Headers(call?.[1]?.headers);

beforeEach(() => useAuthStore.setState({ status: 'anonymous', accessToken: null, user: null }));

test('sends credentials, the cookie transport header and the bearer token', async () => {
  signIn('tok');
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({ ok: true }));
  await createWebApiClient('https://api.example', { fetch: fetcher, refresh: vi.fn() }).get('/x');
  expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ credentials: 'include' });
  expect(headersOf(fetcher.mock.calls[0]).get(AUTH_TRANSPORT_HEADER)).toBe('cookie');
  expect(headersOf(fetcher.mock.calls[0]).get('Authorization')).toBe('Bearer tok');
});

test('omits Authorization without a session', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({ ok: true }));
  await createWebApiClient('https://api.example', { fetch: fetcher, refresh: vi.fn() }).get('/x');
  expect(headersOf(fetcher.mock.calls[0]).has('Authorization')).toBe(false);
});

test('refreshes once on 401 and retries with the new token', async () => {
  signIn('old');
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(unauthorized())
    .mockResolvedValueOnce(json({ data: 'me' }));
  const refresh = vi.fn(async () => {
    useAuthStore.setState({ accessToken: 'new' });
    return true;
  });

  const body = await createWebApiClient('https://api.example', { fetch: fetcher, refresh }).get(
    '/api/v1/me',
  );

  expect(body).toEqual({ data: 'me' });
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(headersOf(fetcher.mock.calls[1]).get('Authorization')).toBe('Bearer new');
});

test('concurrent 401s share the caller-provided refresh', async () => {
  signIn('old');
  const fetcher = vi.fn<typeof fetch>(async (_input, init) =>
    new Headers(init?.headers).get('Authorization') === 'Bearer new'
      ? json({ ok: true })
      : unauthorized(),
  );
  let resolveRefresh: (value: boolean) => void = () => undefined;
  const shared = new Promise<boolean>((resolve) => (resolveRefresh = resolve));
  const refresh = vi.fn(() => shared);
  const client = createWebApiClient('https://api.example', { fetch: fetcher, refresh });

  const both = Promise.all([client.get('/a'), client.get('/b')]);
  await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(2));
  useAuthStore.setState({ accessToken: 'new' });
  resolveRefresh(true);

  await expect(both).resolves.toEqual([{ ok: true }, { ok: true }]);
});

test('a failed refresh surfaces the original 401', async () => {
  signIn('old');
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(unauthorized());
  const client = createWebApiClient('https://api.example', {
    fetch: fetcher,
    refresh: vi.fn(async () => false),
  });

  await expect(client.get('/api/v1/me')).rejects.toMatchObject({ status: 401 });
  await expect(client.get('/api/v1/me')).rejects.toBeInstanceOf(ApiClientError);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

test('does not refresh for /api/v1/auth/* paths', async () => {
  signIn('old');
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(unauthorized());
  const refresh = vi.fn(async () => true);
  const client = createWebApiClient('https://api.example', { fetch: fetcher, refresh });

  await expect(client.post('/api/v1/auth/logout', undefined)).rejects.toMatchObject({
    status: 401,
  });
  expect(refresh).not.toHaveBeenCalled();
});
