import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { OtpInput } from './OtpInput';
import { PasswordInput } from './PasswordInput';
import { ResendCodeButton } from './ResendCodeButton';
import { StepIndicator } from './StepIndicator';

afterEach(() => vi.useRealTimers());

test('OtpInput keeps only digits', async () => {
  render(<OtpInput aria-label="Mã OTP" />);
  const input = screen.getByLabelText('Mã OTP');
  await userEvent.type(input, '12 3-45a6');
  expect(input).toHaveValue('123456');
  await userEvent.type(input, '7');
  expect(input).toHaveValue('123456');
  expect(input).toHaveAttribute('inputmode', 'numeric');
  expect(input).toHaveAttribute('autocomplete', 'one-time-code');
});

test('OtpInput accepts a pasted code with spaces', async () => {
  render(<OtpInput aria-label="Mã OTP" />);
  const input = screen.getByLabelText('Mã OTP');
  input.focus();
  await userEvent.paste('123 456');
  expect(input).toHaveValue('123456');
});

test('PasswordInput toggles visibility with an accessible button', async () => {
  render(<PasswordInput aria-label="Mật khẩu" />);
  const input = screen.getByLabelText('Mật khẩu');
  expect(input).toHaveAttribute('type', 'password');
  await userEvent.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }));
  expect(input).toHaveAttribute('type', 'text');
  expect(screen.getByRole('button', { name: 'Ẩn mật khẩu' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('ResendCodeButton waits for the server time, then allows a resend', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-05T10:00:00Z'));
  const onResend = vi.fn();
  render(<ResendCodeButton availableAtUtc="2026-11-05T10:01:00Z" onResend={onResend} />);
  expect(screen.getByRole('button', { name: 'Gửi lại mã sau 60 giây' })).toBeDisabled();
  act(() => vi.advanceTimersByTime(59_000));
  expect(screen.getByRole('button', { name: 'Gửi lại mã sau 1 giây' })).toBeDisabled();
  act(() => vi.advanceTimersByTime(1_000));
  fireEvent.click(screen.getByRole('button', { name: 'Gửi lại mã' }));
  expect(onResend).toHaveBeenCalledTimes(1);
});

test('StepIndicator shows the step text and fills the segments up to the current one', () => {
  const { container } = render(<StepIndicator current={2} total={3} label="Nhập mã xác thực" />);
  expect(screen.getByText('Bước 2/3 · Nhập mã xác thực')).toBeInTheDocument();
  const segments = container.querySelectorAll('[data-segment]');
  expect(segments).toHaveLength(3);
  expect([...segments].map((segment) => segment.getAttribute('data-done'))).toEqual([
    'true',
    'true',
    'false',
  ]);
});
