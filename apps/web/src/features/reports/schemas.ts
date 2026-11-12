import { z } from 'zod';

export const revenueFilterSchema = z
  .object({
    fromDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày phải là YYYY-MM-DD')
      .optional()
      .or(z.literal('')),
    toDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày phải là YYYY-MM-DD')
      .optional()
      .or(z.literal('')),
    groupBy: z.enum(['month', 'quarter', 'year']).default('month'),
    productType: z.enum(['all', 'service', 'package']).default('all'),
    top: z.coerce.number().min(1).max(50).default(10),
  })
  .superRefine((data, ctx) => {
    if (data.fromDate && data.toDate) {
      const from = new Date(data.fromDate);
      const to = new Date(data.toDate);

      if (from > to) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Từ ngày không được lớn hơn Đến ngày',
          path: ['fromDate'],
        });
      }

      const diffMs = to.getTime() - from.getTime();
      const fiveYearsMs = 5 * 365.25 * 24 * 60 * 60 * 1000;
      if (diffMs > fiveYearsMs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Khoảng thời gian báo cáo tối đa là 5 năm',
          path: ['toDate'],
        });
      }

      const fromYear = from.getFullYear();
      const toYear = to.getFullYear();
      if (fromYear < 2000 || fromYear > 2100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Năm phải nằm trong khoảng 2000–2100',
          path: ['fromDate'],
        });
      }
      if (toYear < 2000 || toYear > 2100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Năm phải nằm trong khoảng 2000–2100',
          path: ['toDate'],
        });
      }
    }
  });

export type RevenueFilterFormData = z.infer<typeof revenueFilterSchema>;
