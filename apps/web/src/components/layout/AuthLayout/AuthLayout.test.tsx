import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useAuthStore } from '@/stores/authStore';
import { mockApi, renderApp } from '@/test/mockApi';

beforeEach(() => useAuthStore.setState({ status: 'anonymous', user: null, accessToken: null }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  localStorage.clear();
});

test.each([
  ['/login', 'Đăng nhập'],
  ['/register', 'Đăng ký tài khoản'],
  ['/forgot-password', 'Quên mật khẩu'],
])('%s uses the split auth layout without the site header and footer', async (path, title) => {
  mockApi();
  renderApp(path);

  expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
  expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Về trang chủ' })).toHaveAttribute('href', '/');

  const intro = within(screen.getByRole('complementary', { name: 'Giới thiệu Spa Như Nguyệt' }));
  expect(intro.getByText('Đặt lịch hẹn trực tuyến')).toBeInTheDocument();
  expect(intro.getByText('Theo dõi tiến độ liệu trình')).toBeInTheDocument();
  expect(intro.getByText('Mua dịch vụ, gói và thanh toán trực tuyến')).toBeInTheDocument();
});

test('auth pages stay light even with dark saved', async () => {
  localStorage.setItem('spa-theme', 'dark');
  mockApi();
  renderApp('/login');
  await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' });
  await waitFor(() => expect(document.documentElement).toHaveClass('light'));
});

test('the intro panel makes no medical claims', async () => {
  mockApi();
  renderApp('/login');
  const intro = await screen.findByRole('complementary', { name: 'Giới thiệu Spa Như Nguyệt' });
  expect(intro.textContent ?? '').not.toMatch(/y khoa|bệnh án|bác sĩ|điều trị|Bộ Y Tế|HIPAA/i);
});
