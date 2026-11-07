import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { formatTimeUtc } from '@/lib/formatting/formatters';
import { useAuthStore } from '@/stores/authStore';
import { apiError, callsTo, envelope, mockApi, renderApp } from '@/test/mockApi';

const email = 'lan@spa.vn';
const inSeconds = (seconds: number) => new Date(Date.now() + seconds * 1000).toISOString();
const sent = (resendIn = 60) =>
  envelope({ email, expiresAtUtc: inSeconds(300), resendAvailableAtUtc: inSeconds(resendIn) }, 202);
const resetExpiry = inSeconds(600);
const verified = () => envelope({ resetToken: 'reset-token', expiresAtUtc: resetExpiry });

beforeEach(() => useAuthStore.setState({ status: 'anonymous', user: null, accessToken: null }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function sendCode() {
  await userEvent.type(await screen.findByLabelText(/^Email/), email);
  await userEvent.click(screen.getByRole('button', { name: 'Gửi mã' }));
}

async function enterOtp(otp = '123456') {
  await userEvent.type(await screen.findByLabelText(/Mã OTP/), otp);
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận mã' }));
}

async function setNewPassword(password = 'moimatkhau1') {
  await userEvent.type(await screen.findByLabelText(/^Mật khẩu mới/), password);
  await userEvent.type(screen.getByLabelText(/Xác nhận mật khẩu/), password);
  await userEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));
}

test('resets the password in three steps and hands the email to login', async () => {
  const fetcher = mockApi({
    'POST /api/v1/auth/forgot-password/request-otp': () => sent(),
    'POST /api/v1/auth/forgot-password/verify-otp': () => verified(),
    'POST /api/v1/auth/forgot-password/reset': () => new Response(null, { status: 204 }),
  });
  const router = renderApp('/forgot-password');
  expect(await screen.findByText('Bước 1/3 · Nhập email')).toBeInTheDocument();

  await sendCode();
  expect(await screen.findByText('Bước 2/3 · Nhập mã xác thực')).toBeInTheDocument();
  expect(
    screen.getByText(/thuộc một tài khoản đang hoạt động, chúng tôi đã gửi mã/),
  ).toHaveTextContent(
    `Nếu ${email} thuộc một tài khoản đang hoạt động, chúng tôi đã gửi mã gồm 6 chữ số tới email này.`,
  );

  await enterOtp();
  expect(await screen.findByText('Bước 3/3 · Mật khẩu mới')).toBeInTheDocument();
  expect(screen.getByText(`Hoàn tất trước ${formatTimeUtc(resetExpiry)}`)).toBeInTheDocument();

  await setNewPassword();

  await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  expect(router.state.location.state).toEqual({ login: email });
  expect(
    await screen.findByText('Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.'),
  ).toBeInTheDocument();
  expect(callsTo(fetcher, '/forgot-password/reset')[0]?.[1]?.body).toBe(
    JSON.stringify({
      resetToken: 'reset-token',
      newPassword: 'moimatkhau1',
      confirmPassword: 'moimatkhau1',
    }),
  );
});

test('otp_invalid stays on step 2 under the code field', async () => {
  mockApi({
    'POST /api/v1/auth/forgot-password/request-otp': () => sent(),
    'POST /api/v1/auth/forgot-password/verify-otp': () =>
      apiError(400, 'otp_invalid', 'Mã OTP không đúng.'),
  });
  renderApp('/forgot-password');
  await sendCode();

  await enterOtp();

  expect(await screen.findByText('Mã OTP không đúng.')).toBeInTheDocument();
  expect(screen.getByLabelText(/Mã OTP/)).toHaveValue('');
});

test('a locked account shows the reason and no confirm button', async () => {
  mockApi({
    'POST /api/v1/auth/forgot-password/request-otp': () => sent(),
    'POST /api/v1/auth/forgot-password/verify-otp': () =>
      apiError(403, 'account_locked', 'Tài khoản đã bị khóa. Vui lòng liên hệ spa.'),
  });
  renderApp('/forgot-password');
  await sendCode();

  await enterOtp();

  expect(await screen.findByRole('alert')).toHaveTextContent('Tài khoản đã bị khóa.');
  expect(screen.queryByRole('button', { name: 'Xác nhận mã' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Về đăng nhập/ })).toHaveAttribute('href', '/login');
});

test('invalid_reset_token goes back to step 1 keeping the email', async () => {
  mockApi({
    'POST /api/v1/auth/forgot-password/request-otp': () => sent(),
    'POST /api/v1/auth/forgot-password/verify-otp': () => verified(),
    'POST /api/v1/auth/forgot-password/reset': () =>
      apiError(
        400,
        'invalid_reset_token',
        'Yêu cầu đặt lại mật khẩu không hợp lệ hoặc đã hết hạn, vui lòng làm lại từ đầu.',
      ),
  });
  renderApp('/forgot-password');
  await sendCode();
  await enterOtp();

  await setNewPassword();

  expect(await screen.findByText('Bước 1/3 · Nhập email')).toBeInTheDocument();
  expect(screen.getByLabelText(/^Email/)).toHaveValue(email);
  expect(screen.getByRole('alert')).toHaveTextContent('vui lòng làm lại từ đầu');
});

test('a successful reset ends a session open in this tab', async () => {
  useAuthStore.setState({ status: 'anonymous', accessToken: null });
  mockApi({
    'POST /api/v1/auth/forgot-password/request-otp': () => sent(),
    'POST /api/v1/auth/forgot-password/verify-otp': () => verified(),
    'POST /api/v1/auth/forgot-password/reset': () => {
      // Simulates a session that became active in this tab while resetting.
      useAuthStore.setState({ status: 'authenticated', accessToken: 'old' });
      return new Response(null, { status: 204 });
    },
  });
  renderApp('/forgot-password');
  await sendCode();
  await enterOtp();

  await setNewPassword();

  await waitFor(() =>
    expect(useAuthStore.getState()).toMatchObject({
      status: 'anonymous',
      accessToken: null,
      endReason: 'password_reset',
    }),
  );
});

test('resend shows the neutral toast and waits for the server time', async () => {
  let resendIn = -1;
  mockApi({ 'POST /api/v1/auth/forgot-password/request-otp': () => sent(resendIn) });
  renderApp('/forgot-password');
  await sendCode();

  resendIn = 60;
  await userEvent.click(await screen.findByRole('button', { name: 'Gửi lại mã' }));

  expect(
    await screen.findByText('Nếu email có tài khoản, mã mới đã được gửi.'),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Gửi lại mã sau (59|60) giây/ })).toBeDisabled();
});

test('"Đổi email" returns to step 1', async () => {
  mockApi({ 'POST /api/v1/auth/forgot-password/request-otp': () => sent() });
  renderApp('/forgot-password');
  await sendCode();

  await userEvent.click(await screen.findByRole('button', { name: 'Đổi email' }));

  expect(await screen.findByText('Bước 1/3 · Nhập email')).toBeInTheDocument();
  expect(screen.getByLabelText(/^Email/)).toHaveValue(email);
});
