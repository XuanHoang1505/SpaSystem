import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { UserRole } from '@spa/shared-types';
import { useAuthStore } from '@/stores/authStore';
import { apiError, callsTo, mockApi, renderApp } from '@/test/mockApi';

const signIn = (role: UserRole = 'owner') =>
  useAuthStore.setState({
    status: 'authenticated',
    accessToken: 'access',
    endReason: null,
    user: { id: 'u1', fullName: 'Nguyễn Thị Lan', email: 'lan@spa.vn', role },
  });

// The site header is the first banner; page content may have its own <header>.
const header = () => within(screen.getAllByRole('banner')[0] as HTMLElement);

beforeEach(() => useAuthStore.setState({ status: 'anonymous', user: null, accessToken: null }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test('anonymous visitors see Đăng nhập and Đăng ký in the header', async () => {
  mockApi();
  renderApp('/services');
  expect(await header().findByRole('link', { name: 'Đăng nhập' })).toHaveAttribute(
    'href',
    '/login',
  );
  expect(header().getByRole('link', { name: 'Đăng ký' })).toHaveAttribute('href', '/register');
  expect(header().queryByRole('button', { name: 'Tài khoản của bạn' })).not.toBeInTheDocument();
});

test('the header navigation has no auth pages (they are reached from the buttons and forms)', async () => {
  mockApi();
  renderApp('/services');
  const nav = within(await header().findByRole('navigation', { name: 'Điều hướng chính' }));
  expect(nav.queryByRole('link', { name: 'Quên mật khẩu' })).not.toBeInTheDocument();
  expect(nav.queryByRole('link', { name: 'Đăng nhập' })).not.toBeInTheDocument();
  expect(nav.queryByRole('link', { name: 'Đăng ký' })).not.toBeInTheDocument();
});

test('while restoring, the header shows a placeholder instead of the buttons', async () => {
  mockApi();
  useAuthStore.setState({ status: 'restoring' });
  renderApp('/services');
  expect(await header().findByTestId('account-skeleton')).toBeInTheDocument();
  expect(header().queryByRole('link', { name: 'Đăng nhập' })).not.toBeInTheDocument();
});

test('a signed-in owner gets an account menu with their area and logout', async () => {
  mockApi();
  signIn('owner');
  renderApp('/services');

  const trigger = await header().findByRole('button', { name: 'Tài khoản của bạn' });
  expect(trigger).toHaveTextContent('L');
  await userEvent.click(trigger);

  const menu = await screen.findByRole('menu');
  expect(within(menu).getByText('Nguyễn Thị Lan')).toBeInTheDocument();
  expect(within(menu).getByText('lan@spa.vn')).toBeInTheDocument();
  expect(within(menu).getByRole('menuitem', { name: 'Không gian của tôi' })).toHaveAttribute(
    'href',
    '/owner',
  );
  expect(within(menu).getByRole('menuitem', { name: 'Đăng xuất' })).toBeInTheDocument();
});

test('logout clears session even when the API fails', async () => {
  mockApi({ 'POST /api/v1/auth/logout': () => apiError(500, 'internal_error', 'x') });
  signIn('customer');
  const router = renderApp('/services');

  await userEvent.click(await header().findByRole('button', { name: 'Tài khoản của bạn' }));
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Đăng xuất' }));

  await waitFor(() => expect(useAuthStore.getState().status).toBe('anonymous'));
  // endReason goes back to null once the home page is shown (useSettleLogout).
  expect(useAuthStore.getState()).toMatchObject({ accessToken: null, user: null });
  expect(router.state.location.pathname).toBe('/');
  expect(await screen.findByText('Đã đăng xuất.')).toBeInTheDocument();
});

test('logout from the sidebar sends no body and leaves the workspace', async () => {
  const fetcher = mockApi({
    'POST /api/v1/auth/logout': () => new Response(null, { status: 204 }),
  });
  signIn('owner');
  const router = renderApp('/owner');

  expect(await screen.findByText('Chủ spa')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));

  await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  expect(useAuthStore.getState().status).toBe('anonymous');
  expect(callsTo(fetcher, '/api/v1/auth/logout')[0]?.[1]?.body).toBeUndefined();

  // Later guarded links ask to log in again instead of silently going home.
  await waitFor(() => expect(useAuthStore.getState().endReason).toBeNull());
  await router.navigate('/account');
  await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  expect(router.state.location.search).toBe('?redirect=%2Faccount');
});
