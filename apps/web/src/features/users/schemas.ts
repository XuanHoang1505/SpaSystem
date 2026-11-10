import { z } from 'zod';

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const passwordLength = `Mật khẩu phải có từ ${PASSWORD_MIN} đến ${PASSWORD_MAX} ký tự.`;

const strongPassword = z
  .string()
  .min(1, 'Vui lòng nhập mật khẩu.')
  .min(PASSWORD_MIN, passwordLength)
  .max(PASSWORD_MAX, passwordLength)
  .refine((value) => /\p{L}/u.test(value) && /\d/.test(value), {
    message: 'Mật khẩu phải có ít nhất một chữ cái và một chữ số.',
  });

export const profileSchema = z.object({
  fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên.').max(100, 'Họ tên tối đa 100 ký tự.'),
  phoneNumber: z.string().optional(),
  dateOfBirth: z
    .string()
    .nullable()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const d = new Date(val);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return d <= today;
      },
      { message: 'Ngày sinh không được ở tương lai.' },
    ),
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
