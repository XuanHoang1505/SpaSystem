import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { UserRole } from '@spa/shared-types';
import { useAuthStore } from '@/stores/authStore';
import { apiError, authResult, callsTo, envelope, mockApi, renderApp } from '@/test/mockApi';

beforeEach(() => useAuthStore.setState({ status: 'anonymous', user: null, accessToken: null }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function fillAndSubmit(login = 'lan@spa.vn', password = 'matkhau123') {
  await userEvent.type(await screen.findByLabelText(/Email hoặc số điện thoại/), login);
  await userEvent.type(screen.getByLabelText(/^Mật khẩu/), password);
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
}

test.each([
  ['owner', '/login', '/owner'],
  ['customer', '/login', '/account'],
  ['owner', '/login?redirect=%2Fowner%2Fstaff', '/owner/staff'],
  ['customer', '/login?redirect=%2Fowner', '/account'],
] as const)('a %s logging in at %s lands on %s', async (role: UserRole, start, landing) => {
  const fetcher = mockApi({ 'POST /api/v1/auth/login': () => envelope(authResult(role)) });
  const router = renderApp(start);

  await fillAndSubmit();

  await waitFor(() => expect(router.state.location.pathname).toBe(landing));
  expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', accessToken: 'access' });
  expect(callsTo(fetcher, '/api/v1/auth/login')[0]?.[1]?.body).toBe(
    JSON.stringify({ login: 'lan@spa.vn', password: 'matkhau123' }),
  );
});

test('invalid_credentials shows the server message, clears and focuses the password', async () => {
  mockApi({
    'POST /api/v1/auth/login': () =>
      apiError(401, 'invalid_credentials', 'Email/số điện thoại hoặc mật khẩu không đúng.'),
  });
  renderApp('/login');

  await fillAndSubmit();

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Email/số điện thoại hoặc mật khẩu không đúng.',
  );
  const password = screen.getByLabelText(/^Mật khẩu/);
  expect(password).toHaveValue('');
  expect(password).toHaveFocus();
});

test.each([
  [403, 'account_locked', 'Tài khoản đã bị khóa. Vui lòng liên hệ spa.'],
  [403, 'account_inactive', 'Tài khoản đã ngừng hoạt động.'],
  [429, 'rate_limited', 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.'],
])('%s %s shows the server message and keeps the input', async (status, code, message) => {
  mockApi({ 'POST /api/v1/auth/login': () => apiError(status, code, message) });
  renderApp('/login');

  await fillAndSubmit();

  expect(await screen.findByRole('alert')).toHaveTextContent(message);
  expect(screen.getByLabelText(/Email hoặc số điện thoại/)).toHaveValue('lan@spa.vn');
  expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeEnabled();
});

test('no connection shows the fixed message', async () => {
  const fetcher = mockApi();
  fetcher.mockImplementation(async (input) => {
    if (String(input).endsWith('/login')) throw new TypeError('Failed to fetch');
    return apiError(401, 'invalid_refresh_token', 'x');
  });
  renderApp('/login');

  await fillAndSubmit();

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.',
  );
});

test('server field errors land under the field', async () => {
  mockApi({
    'POST /api/v1/auth/login': () =>
      apiError(400, 'NotEmptyValidator', 'Mật khẩu quá dài.', 'Password'),
  });
  renderApp('/login');

  await fillAndSubmit();

  expect(await screen.findByText('Mật khẩu quá dài.')).toBeInTheDocument();
  expect(screen.getByLabelText(/^Mật khẩu/)).toHaveAttribute('aria-invalid', 'true');
});

test('submits once on double click', async () => {
  let release: () => void = () => undefined;
  const fetcher = mockApi({
    'POST /api/v1/auth/login': () =>
      new Promise((resolve) => (release = () => resolve(envelope(authResult())))),
  });
  renderApp('/login');
  await userEvent.type(await screen.findByLabelText(/Email hoặc số điện thoại/), 'lan@spa.vn');
  await userEvent.type(screen.getByLabelText(/^Mật khẩu/), 'matkhau123');

  await userEvent.dblClick(screen.getByRole('button', { name: 'Đăng nhập' }));
  release();

  await waitFor(() => expect(useAuthStore.getState().status).toBe('authenticated'));
  expect(callsTo(fetcher, '/api/v1/auth/login')).toHaveLength(1);
});

test('empty fields are caught before any request', async () => {
  const fetcher = mockApi();
  renderApp('/login');
  await userEvent.click(await screen.findByRole('button', { name: 'Đăng nhập' }));

  expect(await screen.findByText('Vui lòng nhập email hoặc số điện thoại.')).toBeInTheDocument();
  expect(screen.getByText('Vui lòng nhập mật khẩu.')).toBeInTheDocument();
  expect(callsTo(fetcher, '/api/v1/auth/login')).toHaveLength(0);
});

test('prefills the login handed over by register or reset, and links to both', async () => {
  mockApi();
  renderApp('/login', { login: 'a@b.vn' });

  expect(await screen.findByLabelText(/Email hoặc số điện thoại/)).toHaveValue('a@b.vn');
  expect(screen.getByRole('link', { name: 'Quên mật khẩu?' })).toHaveAttribute(
    'href',
    '/forgot-password',
  );
  expect(screen.getByRole('link', { name: 'Đăng ký' })).toHaveAttribute('href', '/register');
});

test('without an API URL the form is disabled and nothing is sent', async () => {
  const fetcher = mockApi();
  vi.stubEnv('VITE_API_BASE_URL', '');
  renderApp('/login');

  expect(await screen.findByText('Configuration Error')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeDisabled();
  expect(fetcher).not.toHaveBeenCalled();
});
