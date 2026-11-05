import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useAuthStore } from '@/stores/authStore';
import { refreshSession, restoreSession } from './session';

const user = { id: 'u1', fullName: 'Nguyễn Thị Lan', email: 'lan@spa.vn', role: 'customer' };
const ok = () =>
  new Response(
    JSON.stringify({
      success: true,
      data: {
        accessToken: 'access',
        accessTokenExpiresAtUtc: '2026-11-05T10:15:00Z',
        refreshToken: null,
        refreshTokenExpiresAtUtc: null,
        user,
      },
      errors: [],
    }),
  );
const invalid = () =>
  new Response(
    JSON.stringify({
      success: false,
      errors: [{ code: 'invalid_refresh_token', message: 'Phiên đăng nhập đã hết hạn.' }],
    }),
    { status: 401 },
  );

let fetcher: ReturnType<typeof vi.fn<typeof fetch>>;

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example');
  fetcher = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetcher);
  useAuthStore.setState({ status: 'restoring', user: null, accessToken: null, endReason: null });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test('restoreSession authenticates from the cookie', async () => {
  fetcher.mockResolvedValue(ok());
  await restoreSession();
  expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', user });
  expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.example/api/v1/auth/refresh');
  expect(fetcher.mock.calls[0]?.[1]?.body).toBeUndefined();
});

test('restoreSession retries once after 300 ms on 401 (another tab rotated the cookie)', async () => {
  vi.useFakeTimers();
  fetcher.mockResolvedValueOnce(invalid()).mockResolvedValueOnce(ok());
  const restoring = restoreSession();
  await vi.advanceTimersByTimeAsync(300);
  await restoring;
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(useAuthStore.getState().status).toBe('authenticated');
});

test('restoreSession becomes anonymous after two 401s, without an end reason', async () => {
  vi.useFakeTimers();
  fetcher.mockImplementation(async () => invalid());
  const restoring = restoreSession();
  await vi.advanceTimersByTimeAsync(300);
  await restoring;
  expect(useAuthStore.getState()).toMatchObject({ status: 'anonymous', endReason: null });
});

test('restoreSession becomes anonymous when the network is down', async () => {
  fetcher.mockRejectedValue(new TypeError('Failed to fetch'));
  await restoreSession();
  expect(useAuthStore.getState().status).toBe('anonymous');
  expect(fetcher).toHaveBeenCalledTimes(1);
});

test('restoreSession becomes anonymous without an API URL and makes no request', async () => {
  vi.stubEnv('VITE_API_BASE_URL', '');
  await restoreSession();
  expect(useAuthStore.getState().status).toBe('anonymous');
  expect(fetcher).not.toHaveBeenCalled();
});

test('a failed restore does not end a session that started meanwhile', async () => {
  let fail: (error: unknown) => void = () => undefined;
  fetcher.mockReturnValue(new Promise<Response>((_resolve, reject) => (fail = reject)));
  const restoring = restoreSession();
  useAuthStore.setState({ status: 'authenticated', accessToken: 'fresh' });
  fail(new TypeError('Failed to fetch'));
  await restoring;
  expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', accessToken: 'fresh' });
});

test('concurrent refreshSession calls send one request', async () => {
  fetcher.mockResolvedValue(ok());
  const results = await Promise.all([refreshSession(), refreshSession()]);
  expect(results).toEqual([true, true]);
  expect(fetcher).toHaveBeenCalledTimes(1);
});

test('a failed refreshSession ends the session as expired', async () => {
  useAuthStore.setState({ status: 'authenticated', accessToken: 'old' });
  fetcher.mockResolvedValue(invalid());
  expect(await refreshSession()).toBe(false);
  expect(useAuthStore.getState()).toMatchObject({ status: 'anonymous', endReason: 'expired' });
});

test.each([
  ['the network is down', () => Promise.reject(new TypeError('Failed to fetch'))],
  ['the API fails with 500', async () => new Response('{}', { status: 500 })],
])('refreshSession keeps the session when %s', async (_case, answer) => {
  useAuthStore.setState({ status: 'authenticated', accessToken: 'old', endReason: null });
  fetcher.mockImplementation(answer);
  expect(await refreshSession()).toBe(false);
  expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', accessToken: 'old' });
});

test.each([
  [403, 'account_locked'],
  [429, 'rate_limited'],
])('refreshSession ends the session on %s %s', async (status, code) => {
  useAuthStore.setState({ status: 'authenticated', accessToken: 'old' });
  fetcher.mockResolvedValue(
    new Response(JSON.stringify({ success: false, errors: [{ code, message: 'x' }] }), { status }),
  );
  expect(await refreshSession()).toBe(false);
  expect(useAuthStore.getState()).toMatchObject({ status: 'anonymous', endReason: 'expired' });
});
