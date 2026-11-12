import { z } from 'zod';

const phoneRegex = /^0\d{9}$/;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const createStaffSchema = z.object({
  fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên.').max(100, 'Họ tên tối đa 100 ký tự.'),
  email: z.string().trim().min(1, 'Vui lòng nhập email.').email('Email không hợp lệ.'),
  phoneNumber: z
    .string()
    .trim()
    .regex(phoneRegex, 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0.'),
  hireDate: z
    .string()
    .min(1, 'Vui lòng chọn ngày vào làm.')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày vào làm không đúng định dạng YYYY-MM-DD.'),
  specialty: z.string().trim().max(255, 'Chuyên môn tối đa 255 ký tự.').optional(),
  spaServiceIds: z.array(z.string()),
});

export type CreateStaffFormValues = z.infer<typeof createStaffSchema>;

export const updateStaffSchema = z.object({
  fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên.').max(100, 'Họ tên tối đa 100 ký tự.'),
  phoneNumber: z
    .string()
    .trim()
    .regex(phoneRegex, 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0.'),
  hireDate: z
    .string()
    .min(1, 'Vui lòng chọn ngày vào làm.')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày vào làm không đúng định dạng YYYY-MM-DD.'),
  specialty: z
    .string()
    .trim()
    .max(255, 'Chuyên môn tối đa 255 ký tự.')
    .optional()
    .or(z.literal('')),
});

export type UpdateStaffFormValues = z.infer<typeof updateStaffSchema>;

export const updateStaffServicesSchema = z.object({
  spaServiceIds: z.array(z.string()),
});

export type UpdateStaffServicesFormValues = z.infer<typeof updateStaffServicesSchema>;

export const resignStaffSchema = z.object({
  resignationDate: z
    .string()
    .min(1, 'Vui lòng chọn ngày nghỉ việc.')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày nghỉ việc không đúng định dạng YYYY-MM-DD.'),
});

export type ResignStaffFormValues = z.infer<typeof resignStaffSchema>;

export const createShiftSchema = z
  .object({
    staffMemberId: z.string().min(1, 'Vui lòng chọn nhân viên.'),
    date: z
      .string()
      .min(1, 'Vui lòng chọn ngày làm việc.')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày làm việc không đúng định dạng YYYY-MM-DD.'),
    startTime: z.string().regex(timeRegex, 'Giờ bắt đầu chỉ gồm giờ và phút (HH:mm).'),
    endTime: z.string().regex(timeRegex, 'Giờ kết thúc chỉ gồm giờ và phút (HH:mm).'),
  })
  .refine((data) => data.endTime > data.startTime, {
    path: ['endTime'],
    message: 'Giờ kết thúc phải sau giờ bắt đầu (ca không qua đêm).',
  });

export type CreateShiftFormValues = z.infer<typeof createShiftSchema>;

export const updateShiftSchema = z
  .object({
    date: z
      .string()
      .min(1, 'Vui lòng chọn ngày làm việc.')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày làm việc không đúng định dạng YYYY-MM-DD.'),
    startTime: z.string().regex(timeRegex, 'Giờ bắt đầu chỉ gồm giờ và phút (HH:mm).'),
    endTime: z.string().regex(timeRegex, 'Giờ kết thúc chỉ gồm giờ và phút (HH:mm).'),
  })
  .refine((data) => data.endTime > data.startTime, {
    path: ['endTime'],
    message: 'Giờ kết thúc phải sau giờ bắt đầu (ca không qua đêm).',
  });

export type UpdateShiftFormValues = z.infer<typeof updateShiftSchema>;

export const createBatchShiftsSchema = z
  .object({
    staffMemberIds: z
      .array(z.string())
      .min(1, 'Vui lòng chọn ít nhất một nhân viên.')
      .max(50, 'Tối đa 50 nhân viên mỗi lần.'),
    fromDate: z
      .string()
      .min(1, 'Vui lòng chọn ngày bắt đầu.')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày bắt đầu không đúng định dạng YYYY-MM-DD.'),
    toDate: z
      .string()
      .min(1, 'Vui lòng chọn ngày kết thúc.')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày kết thúc không đúng định dạng YYYY-MM-DD.'),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1, 'Chọn ít nhất một thứ trong tuần.'),
    startTime: z.string().regex(timeRegex, 'Giờ bắt đầu chỉ gồm giờ và phút (HH:mm).'),
    endTime: z.string().regex(timeRegex, 'Giờ kết thúc chỉ gồm giờ và phút (HH:mm).'),
  })
  .refine((data) => data.toDate >= data.fromDate, {
    path: ['toDate'],
    message: 'Ngày kết thúc phải từ ngày bắt đầu trở đi.',
  })
  .refine((data) => data.endTime > data.startTime, {
    path: ['endTime'],
    message: 'Giờ kết thúc phải sau giờ bắt đầu (ca không qua đêm).',
  });

export type CreateBatchShiftsFormValues = z.infer<typeof createBatchShiftsSchema>;
