import { expect, test, vi } from 'vitest';
import { ApiClientError } from '@spa/api-client';
import { applyServerFieldErrors, authErrorMessage, serverFieldErrors } from './errors';

const validation = new ApiClientError('Validation failed.', 400, [
  { code: 'RegularExpressionValidator', message: 'Số điện thoại sai.', field: 'PhoneNumber' },
  { code: 'NotEmptyValidator', message: 'Vui lòng nhập họ tên.', field: 'FullName' },
  { code: 'validation_error', message: 'Không có trường.' },
]);

test('serverFieldErrors maps PascalCase fields to camelCase and skips field-less errors', () => {
  expect(serverFieldErrors(validation)).toEqual([
    { field: 'phoneNumber', message: 'Số điện thoại sai.' },
    { field: 'fullName', message: 'Vui lòng nhập họ tên.' },
  ]);
  expect(serverFieldErrors(new Error('x'))).toEqual([]);
});

test('applyServerFieldErrors sets known fields only and focuses the first', () => {
  const setError = vi.fn();
  expect(applyServerFieldErrors(validation, setError, ['phoneNumber'])).toBe(true);
  expect(setError).toHaveBeenCalledTimes(1);
  expect(setError).toHaveBeenCalledWith(
    'phoneNumber',
    { type: 'server', message: 'Số điện thoại sai.' },
    { shouldFocus: true },
  );
  expect(applyServerFieldErrors(validation, vi.fn(), ['email'])).toBe(false);
});

test('authErrorMessage prefers the server message', () => {
  expect(
    authErrorMessage(
      new ApiClientError('x', 401, [{ code: 'invalid_credentials', message: 'Sai thông tin.' }]),
    ),
  ).toBe('Sai thông tin.');
});

test('authErrorMessage uses fixed texts for no connection and unknown errors', () => {
  expect(authErrorMessage(new ApiClientError('Unable to connect to the API.', 0))).toBe(
    'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.',
  );
  expect(authErrorMessage(new ApiClientError('HTTP 500', 500))).toBe(
    'Đã có lỗi xảy ra, vui lòng thử lại.',
  );
  expect(authErrorMessage(new Error('boom'))).toBe('Đã có lỗi xảy ra, vui lòng thử lại.');
});
