import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiClientError, errorCodeOf } from './index';
import { AuthApi } from './auth';

const ok = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ success: true, message: null, data, errors: [], traceId: 't' }), {
    status,
  });

function setup(response: Response = ok({})) {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
  const api = new AuthApi(new ApiClient('https://api.example', { fetch: fetcher }));
  const call = () => {
    const [url, init] = fetcher.mock.calls[0] ?? [];
    return { url, init: init ?? {} };
  };
  return { api, fetcher, call };
}

describe('AuthApi', () => {
  it.each([
    [
      'login',
      '/api/v1/auth/login',
      (api: AuthApi) => api.login({ login: 'a@b.vn', password: 'matkhau123' }),
      { login: 'a@b.vn', password: 'matkhau123' },
    ],
    [
      'requestRegistrationOtp',
      '/api/v1/auth/register/request-otp',
      (api: AuthApi) =>
        api.requestRegistrationOtp({
          fullName: 'Lan',
          email: 'a@b.vn',
          phoneNumber: '0901234567',
          password: 'matkhau123',
          confirmPassword: 'matkhau123',
        }),
      {
        fullName: 'Lan',
        email: 'a@b.vn',
        phoneNumber: '0901234567',
        password: 'matkhau123',
        confirmPassword: 'matkhau123',
      },
    ],
    [
      'verifyRegistrationOtp',
      '/api/v1/auth/register/verify-otp',
      (api: AuthApi) => api.verifyRegistrationOtp({ email: 'a@b.vn', otp: '123456' }),
      { email: 'a@b.vn', otp: '123456' },
    ],
    [
      'requestPasswordResetOtp',
      '/api/v1/auth/forgot-password/request-otp',
      (api: AuthApi) => api.requestPasswordResetOtp({ email: 'a@b.vn' }),
      { email: 'a@b.vn' },
    ],
    [
      'verifyPasswordResetOtp',
      '/api/v1/auth/forgot-password/verify-otp',
      (api: AuthApi) => api.verifyPasswordResetOtp({ email: 'a@b.vn', otp: '123456' }),
      { email: 'a@b.vn', otp: '123456' },
    ],
  ])('%s posts its body to %s', async (_name, path, invoke, body) => {
    const { api, call } = setup();
    await invoke(api);
    expect(call().url).toBe(`https://api.example${path}`);
    expect(call().init.method).toBe('POST');
    expect(call().init.body).toBe(JSON.stringify(body));
  });

  it('refresh and logout without arguments send no body (cookie mode)', async () => {
    const { api, fetcher } = setup(new Response(null, { status: 204 }));
    await api.logout();
    fetcher.mockResolvedValueOnce(ok({ accessToken: 'a' }));
    await api.refresh();
    for (const [url, init] of fetcher.mock.calls) {
      expect(String(url)).toMatch(/\/api\/v1\/auth\/(logout|refresh)$/);
      expect(init?.body).toBeUndefined();
      expect(init?.headers).not.toHaveProperty('Content-Type');
    }
  });

  it('logout and resetPassword resolve undefined on 204', async () => {
    const { api, fetcher } = setup(new Response(null, { status: 204 }));
    await expect(api.logout({ refreshToken: 'r' })).resolves.toBeUndefined();
    fetcher.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(
      api.resetPassword({ resetToken: 't', newPassword: 'moi12345', confirmPassword: 'moi12345' }),
    ).resolves.toBeUndefined();
    expect(fetcher.mock.calls[1]?.[0]).toBe(
      'https://api.example/api/v1/auth/forgot-password/reset',
    );
  });
});

describe('errorCodeOf', () => {
  it('returns the first error code of an ApiClientError', () => {
    expect(
      errorCodeOf(new ApiClientError('x', 401, [{ code: 'invalid_credentials', message: 'x' }])),
    ).toBe('invalid_credentials');
  });
  it('returns undefined for other errors', () => {
    expect(errorCodeOf(new Error('x'))).toBeUndefined();
    expect(errorCodeOf(new ApiClientError('x', 0))).toBeUndefined();
  });
});

describe('ApiClient credentials', () => {
  it('passes credentials to fetch only when configured', async () => {
    const withCredentials = vi.fn<typeof fetch>().mockResolvedValue(ok({}));
    await new ApiClient('https://api.example', {
      fetch: withCredentials,
      credentials: 'include',
    }).get('/x');
    expect(withCredentials).toHaveBeenCalledWith(
      'https://api.example/x',
      expect.objectContaining({ credentials: 'include' }),
    );
    const without = vi.fn<typeof fetch>().mockResolvedValue(ok({}));
    await new ApiClient('https://api.example', { fetch: without }).get('/x');
    expect(without.mock.calls[0]?.[1]).not.toHaveProperty('credentials');
  });
});
