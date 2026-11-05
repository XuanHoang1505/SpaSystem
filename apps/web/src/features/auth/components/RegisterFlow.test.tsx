import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useAuthStore } from '@/stores/authStore';
import { apiError, callsTo, envelope, mockApi, renderApp } from '@/test/mockApi';

const email = 'lan@spa.vn';
const inSeconds = (seconds: number) => new Date(Date.now() + seconds * 1000).toISOString();
const sent = (resendIn = 60) =>
  envelope({ email, expiresAtUtc: inSeconds(300), resendAvailableAtUtc: inSeconds(resendIn) }, 202);

beforeEach(() => useAuthStore.setState({ status: 'anonymous', user: null, accessToken: null }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function fillDetails() {
  await userEvent.type(await screen.findByLabelText(/Họ và tên/), 'Nguyễn Thị Lan');
  await userEvent.type(screen.getByLabelText(/^Email/), email);
  await userEvent.type(screen.getByLabelText(/Số điện thoại/), '0901234567');
  await userEvent.type(screen.getByLabelText(/^Mật khẩu/), 'matkhau123');
  await userEvent.type(screen.getByLabelText(/Xác nhận mật khẩu/), 'matkhau123');
  await userEvent.click(screen.getByRole('button', { name: 'Gửi mã xác thực' }));
}

async function enterOtp(otp = '123456') {
  await userEvent.type(await screen.findByLabelText(/Mã OTP/), otp);
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));
}

test('registers in two steps and hands the email to the login page', async () => {
  const fetcher = mockApi({
    'POST /api/v1/auth/register/request-otp': () => sent(),
    'POST /api/v1/auth/register/verify-otp': () => envelope({ id: 'n', email }, 201),
  });
  const router = renderApp('/register');
  expect(await screen.findByText('Bước 1/2 · Thông tin tài khoản')).toBeInTheDocument();

  await fillDetails();

  expect(await screen.findByText('Bước 2/2 · Xác thực email')).toBeInTheDocument();
  expect(screen.getByText(email, { selector: 'strong' })).toBeInTheDocument();
  expect(screen.getByText(/Mã hết hạn sau 0[45]:\d\d/)).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();

  await enterOtp();

  await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  expect(router.state.location.state).toEqual({ login: email });
  expect(await screen.findByText('Đăng ký thành công. Vui lòng đăng nhập.')).toBeInTheDocument();
  expect(callsTo(fetcher, '/register/verify-otp')[0]?.[1]?.body).toBe(
    JSON.stringify({ email, otp: '123456' }),
  );
});

test('email_exists on step 1 shows the error with login and reset links', async () => {
  mockApi({
    'POST /api/v1/auth/register/request-otp': () =>
      apiError(409, 'email_exists', 'Email này đã được dùng cho một tài khoản khác.'),
  });
  renderApp('/register');

  await fillDetails();

  expect(
    await screen.findByText('Email này đã được dùng cho một tài khoản khác.'),
  ).toBeInTheDocument();
  expect(screen.getByLabelText(/^Email/)).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByRole('link', { name: 'Quên mật khẩu?' })).toHaveAttribute(
    'href',
    '/forgot-password',
  );
});

test('phone_exists at verification goes back to step 1 with the error and the input kept', async () => {
  mockApi({
    'POST /api/v1/auth/register/request-otp': () => sent(),
    'POST /api/v1/auth/register/verify-otp': () =>
      apiError(409, 'phone_exists', 'Số điện thoại này đã được dùng cho một tài khoản khác.'),
  });
  renderApp('/register');
  await fillDetails();

  await enterOtp();

  expect(await screen.findByText('Bước 1/2 · Thông tin tài khoản')).toBeInTheDocument();
  expect(
    screen.getByText('Số điện thoại này đã được dùng cho một tài khoản khác.'),
  ).toBeInTheDocument();
  expect(screen.getByLabelText(/Họ và tên/)).toHaveValue('Nguyễn Thị Lan');
});

test('otp_invalid clears and focuses the code field', async () => {
  mockApi({
    'POST /api/v1/auth/register/request-otp': () => sent(),
    'POST /api/v1/auth/register/verify-otp': () =>
      apiError(400, 'otp_invalid', 'Mã OTP không đúng.'),
  });
  renderApp('/register');
  await fillDetails();

  await enterOtp();

  expect(await screen.findByText('Mã OTP không đúng.')).toBeInTheDocument();
  expect(screen.getByLabelText(/Mã OTP/)).toHaveValue('');
  expect(screen.getByLabelText(/Mã OTP/)).toHaveFocus();
});

test('otp_too_many_attempts locks Xác nhận until a new code is sent', async () => {
  mockApi({
    'POST /api/v1/auth/register/request-otp': () => sent(-1),
    'POST /api/v1/auth/register/verify-otp': () =>
      apiError(400, 'otp_too_many_attempts', 'Bạn đã nhập sai mã OTP quá số lần cho phép.'),
  });
  renderApp('/register');
  await fillDetails();

  await enterOtp();

  expect(
    await screen.findByText('Bạn đã nhập sai mã OTP quá số lần cho phép.'),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Xác nhận' })).toBeDisabled();

  await userEvent.click(screen.getByRole('button', { name: 'Gửi lại mã' }));

  expect(await screen.findByText('Đã gửi lại mã xác thực.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Xác nhận' })).toBeEnabled();
});

test('a resend restarts the countdown from the new server time', async () => {
  let resendIn = -1;
  mockApi({ 'POST /api/v1/auth/register/request-otp': () => sent(resendIn) });
  renderApp('/register');
  await fillDetails();

  resendIn = 60;
  await userEvent.click(await screen.findByRole('button', { name: 'Gửi lại mã' }));

  expect(await screen.findByRole('button', { name: /Gửi lại mã sau (59|60) giây/ })).toBeDisabled();
});

test('email_send_failed offers a retry', async () => {
  let fail = true;
  mockApi({
    'POST /api/v1/auth/register/request-otp': () =>
      fail
        ? apiError(503, 'email_send_failed', 'Không gửi được email lúc này, vui lòng thử lại sau.')
        : sent(),
  });
  renderApp('/register');
  await fillDetails();

  expect(await screen.findByRole('alert')).toHaveTextContent('Không gửi được email lúc này');
  fail = false;
  await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

  expect(await screen.findByText('Bước 2/2 · Xác thực email')).toBeInTheDocument();
});

test('editing the details keeps them and waits for the resend time', async () => {
  mockApi({ 'POST /api/v1/auth/register/request-otp': () => sent(60) });
  renderApp('/register');
  await fillDetails();

  await userEvent.click(await screen.findByRole('button', { name: 'Sửa thông tin' }));

  expect(await screen.findByLabelText(/^Email/)).toHaveValue(email);
  expect(screen.getByRole('button', { name: 'Gửi mã xác thực' })).toBeDisabled();
  expect(screen.getByText(/Gửi lại mã sau (59|60) giây/)).toBeInTheDocument();
});
