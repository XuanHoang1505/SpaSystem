import { z } from 'zod';

// Mirrors BR-AUTH-10 and the backend validators so most mistakes are caught before a request; the API stays the
// source of truth. Messages are the backend's own Vietnamese texts.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^0\d{9}$/;
const PASSWORD_MIN = 8; // Account:PasswordMinLength default
const PASSWORD_MAX = 128;
const passwordLength = `Mật khẩu phải có từ ${PASSWORD_MIN} đến ${PASSWORD_MAX} ký tự.`;
const mismatch = 'Mật khẩu xác nhận không khớp.';

const email = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập email.')
  .max(255, 'Email không hợp lệ.')
  .regex(EMAIL, 'Email không hợp lệ.');

const strongPassword = z
  .string()
  .min(1, 'Vui lòng nhập mật khẩu.')
  .min(PASSWORD_MIN, passwordLength)
  .max(PASSWORD_MAX, passwordLength)
  .refine((value) => /\p{L}/u.test(value) && /\d/.test(value), {
    message: 'Mật khẩu phải có ít nhất một chữ cái và một chữ số.',
  });

export const loginSchema = z.object({
  login: z.string().trim().min(1, 'Vui lòng nhập email hoặc số điện thoại.').max(255),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.').max(PASSWORD_MAX),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập họ tên.')
      .max(100, 'Họ tên tối đa 100 ký tự.'),
    email,
    phoneNumber: z
      .string()
      .trim()
      .regex(PHONE, 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0.'),
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((values) => values.confirmPassword === values.password, {
    path: ['confirmPassword'],
    message: mismatch,
  });

export const otpSchema = z.object({ otp: z.string().regex(/^\d{6}$/, 'Mã OTP gồm 6 chữ số.') });

export const emailSchema = z.object({ email });

export const newPasswordSchema = z
  .object({ newPassword: strongPassword, confirmPassword: z.string() })
  .refine((values) => values.confirmPassword === values.newPassword, {
    path: ['confirmPassword'],
    message: mismatch,
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type OtpValues = z.infer<typeof otpSchema>;
export type EmailValues = z.infer<typeof emailSchema>;
export type NewPasswordValues = z.infer<typeof newPasswordSchema>;
