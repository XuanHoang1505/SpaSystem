import { z } from 'zod';

const passwordMin = 8;
const passwordMax = 128;
const passwordLength = `Mật khẩu phải có từ ${passwordMin} đến ${passwordMax} ký tự.`;

const vietnamToday = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const strongPassword = z
  .string()
  .min(1, 'Vui lòng nhập mật khẩu.')
  .min(passwordMin, passwordLength)
  .max(passwordMax, passwordLength)
  .refine((value) => /\p{L}/u.test(value) && /\d/.test(value), {
    message: 'Mật khẩu phải có ít nhất một chữ cái và một chữ số.',
  });

export const profileSchema = z.object({
  fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên.').max(100, 'Họ tên tối đa 100 ký tự.'),
  phoneNumber: z.string().optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày sinh không hợp lệ.')
    .nullable()
    .refine((value) => value === null || value >= '1900-01-01', {
      message: 'Ngày sinh không được trước 01/01/1900.',
    })
    .refine((value) => value === null || value <= vietnamToday(), {
      message: 'Ngày sinh không được ở tương lai.',
    }),
  gender: z.enum(['male', 'female', 'other']).nullable().optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại.'),
    newPassword: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    message: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
  })
  .refine((values) => values.confirmPassword === values.newPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu xác nhận không khớp.',
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
