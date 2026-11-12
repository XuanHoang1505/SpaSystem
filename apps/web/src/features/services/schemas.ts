import { z } from 'zod';

export const serviceStepSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập tên bước.')
    .max(150, 'Tên bước tối đa 150 ký tự.'),
  durationMinutes: z.preprocess(
    (val) =>
      val === '' || val === null || val === undefined || (typeof val === 'number' && Number.isNaN(val))
        ? undefined
        : Number(val),
    z
      .number()
      .int('Thời lượng phải là số nguyên.')
      .min(1, 'Thời lượng tối thiểu 1 phút.')
      .max(1440, 'Thời lượng tối đa 1440 phút.')
      .optional()
      .nullable(),
  ),
  description: z
    .string()
    .trim()
    .max(1000, 'Mô tả bước tối đa 1000 ký tự.')
    .optional()
    .nullable()
    .or(z.literal('')),
});

export type ServiceStepFormValues = z.infer<typeof serviceStepSchema>;
export type ServiceStepFormInput = z.input<typeof serviceStepSchema>;

export const serviceFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập tên dịch vụ.')
    .max(150, 'Tên dịch vụ tối đa 150 ký tự.'),
  categoryId: z.string().trim().min(1, 'Vui lòng chọn danh mục dịch vụ.'),
  price: z.coerce
    .number()
    .int('Giá phải là số nguyên (đồng).')
    .min(0, 'Giá phải từ 0 đồng.')
    .max(999_999_999_999, 'Giá tối đa 999.999.999.999 đồng.'),
  durationMinutes: z.coerce
    .number()
    .int('Thời lượng phải là số nguyên.')
    .min(1, 'Thời lượng từ 1 đến 1440 phút.')
    .max(1440, 'Thời lượng từ 1 đến 1440 phút.'),
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
  steps: z.array(serviceStepSchema).default([]),
});

export type ServiceFormValues = z.infer<typeof serviceFormSchema>;
export type ServiceFormInput = z.input<typeof serviceFormSchema>;

export const serviceCategoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập tên danh mục.')
    .max(100, 'Tên danh mục tối đa 100 ký tự.'),
  description: z
    .string()
    .trim()
    .max(500, 'Mô tả tối đa 500 ký tự.')
    .optional()
    .nullable()
    .or(z.literal('')),
  sortOrder: z.coerce
    .number()
    .int('Thứ tự hiển thị phải là số nguyên.')
    .min(0, 'Thứ tự hiển thị phải lớn hơn hoặc bằng 0.')
    .default(0),
  isActive: z.boolean().default(true),
});

export type ServiceCategoryFormValues = z.infer<typeof serviceCategoryFormSchema>;
export type ServiceCategoryFormInput = z.input<typeof serviceCategoryFormSchema>;
