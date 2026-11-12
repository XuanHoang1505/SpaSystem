import { z } from 'zod';

export const packageItemSchema = z.object({
  spaServiceId: z.string().trim().min(1, 'Vui lòng chọn dịch vụ.'),
  sessionCount: z.coerce
    .number()
    .int('Số buổi phải là số nguyên.')
    .min(1, 'Số buổi phải từ 1 đến 100.')
    .max(100, 'Số buổi phải từ 1 đến 100.'),
  sortOrder: z.coerce
    .number()
    .int('Thứ tự phải là số nguyên.')
    .min(1, 'Thứ tự phải từ 1 đến 100.')
    .max(100, 'Thứ tự phải từ 1 đến 100.'),
  minDaysBetweenSessions: z.coerce
    .number()
    .int('Khoảng cách ngày phải là số nguyên.')
    .min(0, 'Khoảng cách giữa các buổi phải từ 0 đến 365 ngày.')
    .max(365, 'Khoảng cách giữa các buổi phải từ 0 đến 365 ngày.'),
  note: z
    .string()
    .trim()
    .max(1000, 'Ghi chú tối đa 1000 ký tự.')
    .optional()
    .nullable()
    .or(z.literal('')),
});

export type PackageItemFormValues = z.infer<typeof packageItemSchema>;
export type PackageItemFormInput = z.input<typeof packageItemSchema>;

export const packageFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập tên gói dịch vụ.')
      .max(150, 'Tên gói dịch vụ tối đa 150 ký tự.'),
    price: z.coerce
      .number()
      .int('Giá phải là số nguyên (đồng).')
      .min(0, 'Giá phải từ 0 đồng.')
      .max(999_999_999_999, 'Giá tối đa 999.999.999.999 đồng.'),
    validityDays: z.coerce
      .number()
      .int('Thời hạn phải là số nguyên ngày.')
      .min(1, 'Thời hạn sử dụng phải từ 1 đến 3650 ngày.')
      .max(3650, 'Thời hạn sử dụng phải từ 1 đến 3650 ngày.'),
    shortDescription: z
      .string()
      .trim()
      .max(300, 'Mô tả ngắn tối đa 300 ký tự.')
      .optional()
      .nullable()
      .or(z.literal('')),
    description: z
      .string()
      .trim()
      .max(4000, 'Mô tả tối đa 4000 ký tự.')
      .optional()
      .nullable()
      .or(z.literal('')),
    saleStartDate: z
      .string()
      .optional()
      .nullable()
      .or(z.literal('')),
    saleEndDate: z
      .string()
      .optional()
      .nullable()
      .or(z.literal('')),
    items: z
      .array(packageItemSchema)
      .min(1, 'Gói phải có ít nhất 1 dịch vụ thành phần.')
      .max(20, 'Gói tối đa 20 dịch vụ thành phần.'),
  })
  .refine(
    (data) => {
      if (!data.saleStartDate || !data.saleEndDate) return true;
      return data.saleEndDate >= data.saleStartDate;
    },
    {
      path: ['saleEndDate'],
      message: 'Ngày kết thúc bán phải từ ngày bắt đầu bán trở đi.',
    },
  );

export type PackageFormValues = z.infer<typeof packageFormSchema>;
export type PackageFormInput = z.input<typeof packageFormSchema>;
