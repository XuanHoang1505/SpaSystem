import { describe, expect, test } from 'vitest';
import type { z } from 'zod';
import { emailSchema, loginSchema, newPasswordSchema, otpSchema, registerSchema } from './schemas';

const messages = (schema: z.ZodType, value: unknown) => {
  const result = schema.safeParse(value);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

const register = {
  fullName: 'Nguyễn Thị Lan',
  email: 'lan@spa.vn',
  phoneNumber: '0901234567',
  password: 'matkhau123',
  confirmPassword: 'matkhau123',
};

describe('registerSchema', () => {
  test('accepts valid input and trims it', () => {
    const parsed = registerSchema.parse({ ...register, fullName: '  Lan ', email: '  A@B.VN ' });
    expect(parsed.fullName).toBe('Lan');
    expect(parsed.email).toBe('A@B.VN');
  });

  test('empty fields give the backend messages', () => {
    expect(
      messages(registerSchema, {
        fullName: ' ',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
      }),
    ).toEqual(
      expect.arrayContaining([
        'Vui lòng nhập họ tên.',
        'Vui lòng nhập email.',
        'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0.',
        'Vui lòng nhập mật khẩu.',
      ]),
    );
  });

  test.each([
    ['abc1234', 'Mật khẩu phải có từ 8 đến 128 ký tự.'],
    ['abcdefgh', 'Mật khẩu phải có ít nhất một chữ cái và một chữ số.'],
    ['12345678', 'Mật khẩu phải có ít nhất một chữ cái và một chữ số.'],
    ['a1'.repeat(65), 'Mật khẩu phải có từ 8 đến 128 ký tự.'],
  ])('weak password %s is rejected', (password, message) => {
    expect(
      messages(registerSchema, { ...register, password, confirmPassword: password }),
    ).toContain(message);
  });

  test('a different confirmation is reported on confirmPassword', () => {
    const result = registerSchema.safeParse({ ...register, confirmPassword: 'khac12345' });
    expect(result.success).toBe(false);
    expect(result.error?.issues).toContainEqual(
      expect.objectContaining({
        path: ['confirmPassword'],
        message: 'Mật khẩu xác nhận không khớp.',
      }),
    );
  });

  test.each(['090123456', '1901234567', '09012345678', '090 1234567'])(
    'phone %s is rejected',
    (phoneNumber) => {
      expect(messages(registerSchema, { ...register, phoneNumber })).toContain(
        'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0.',
      );
    },
  );

  test.each(['lan@spa', 'lan spa@x.vn', 'lan@@spa.vn'])('email %s is rejected', (email) => {
    expect(messages(registerSchema, { ...register, email })).toContain('Email không hợp lệ.');
  });

  test('a full name over 100 characters is rejected', () => {
    expect(messages(registerSchema, { ...register, fullName: 'a'.repeat(101) })).not.toEqual([]);
  });
});

test('loginSchema requires both fields and trims the login', () => {
  expect(messages(loginSchema, { login: ' ', password: '' })).toEqual([
    'Vui lòng nhập email hoặc số điện thoại.',
    'Vui lòng nhập mật khẩu.',
  ]);
  expect(loginSchema.parse({ login: ' 0901234567 ', password: 'x' }).login).toBe('0901234567');
});

test('otpSchema requires exactly six digits', () => {
  expect(messages(otpSchema, { otp: '12345' })).toEqual(['Mã OTP gồm 6 chữ số.']);
  expect(otpSchema.safeParse({ otp: '123456' }).success).toBe(true);
});

test('emailSchema and newPasswordSchema reuse the same rules', () => {
  expect(messages(emailSchema, { email: 'x' })).toEqual(['Email không hợp lệ.']);
  expect(
    messages(newPasswordSchema, { newPassword: 'matkhau123', confirmPassword: 'matkhau124' }),
  ).toEqual(['Mật khẩu xác nhận không khớp.']);
});
