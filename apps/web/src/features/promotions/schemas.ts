import { z } from 'zod';

export const promotionFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập mã khuyến mãi.')
      .regex(
        /^[A-Za-z0-9_-]{3,50}$/,
        'Mã gồm 3–50 ký tự chữ cái không dấu, chữ số, dấu gạch ngang hoặc gạch dưới.',
      )
      .transform((val) => val.toUpperCase()),
    description: z
      .string()
      .trim()
      .max(1000, 'Mô tả tối đa 1000 ký tự.')
      .optional()
      .nullable()
      .or(z.literal('')),
    discountType: z.enum(['percentage', 'fixed_amount'] as const, {
      error: 'Hình thức giảm phải là percentage hoặc fixed_amount.',
    }),
    discountValue: z.coerce.number({
      error: 'Vui lòng nhập giá trị giảm.',
    }),
    minOrderAmount: z.coerce
      .number({
        error: 'Vui lòng nhập giá trị đơn tối thiểu.',
      })
      .int('Giá trị đơn tối thiểu là số nguyên từ 0 đến 999.999.999.999 đồng.')
      .min(0, 'Giá trị đơn tối thiểu là số nguyên từ 0 đến 999.999.999.999 đồng.')
      .max(999_999_999_999, 'Giá trị đơn tối thiểu là số nguyên từ 0 đến 999.999.999.999 đồng.'),
    maxDiscountAmount: z.preprocess(
      (val) =>
        val === '' || val === null || val === undefined || (typeof val === 'number' && Number.isNaN(val))
          ? null
          : Number(val),
      z
        .number()
        .int('Số tiền giảm tối đa là số nguyên từ 1 đồng.')
        .min(1, 'Số tiền giảm tối đa là số nguyên từ 1 đồng.')
        .max(999_999_999_999, 'Số tiền giảm tối đa là số nguyên từ 1 đồng.')
        .optional()
        .nullable(),
    ),
    startsAt: z.string().min(1, 'Vui lòng nhập thời điểm bắt đầu.'),
    endsAt: z.string().min(1, 'Vui lòng nhập thời điểm kết thúc.'),
    perCustomerLimit: z.preprocess(
      (val) =>
        val === '' || val === null || val === undefined || (typeof val === 'number' && Number.isNaN(val))
          ? null
          : Number(val),
      z
        .number()
        .int('Số lần mỗi khách từ 1 đến 1000.')
        .min(1, 'Số lần mỗi khách từ 1 đến 1000.')
        .max(1000, 'Số lần mỗi khách từ 1 đến 1000.')
        .optional()
        .nullable(),
    ),
    usageLimit: z.preprocess(
      (val) =>
        val === '' || val === null || val === undefined || (typeof val === 'number' && Number.isNaN(val))
          ? null
          : Number(val),
      z
        .number()
        .int('Tổng số lượt từ 1 đến 1.000.000.')
        .min(1, 'Tổng số lượt từ 1 đến 1.000.000.')
        .max(1_000_000, 'Tổng số lượt từ 1 đến 1.000.000.')
        .optional()
        .nullable(),
    ),
  })
  .superRefine((data, ctx) => {
    if (data.discountType === 'percentage') {
      const isTwoDecimalsOrFewer = /^\d+(\.\d{1,2})?$/.test(String(data.discountValue));
      if (data.discountValue < 0.01 || data.discountValue > 100 || !isTwoDecimalsOrFewer) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['discountValue'],
          message: 'Phần trăm giảm từ 0,01 đến 100, tối đa 2 chữ số thập phân.',
        });
      }
    } else if (data.discountType === 'fixed_amount') {
      if (
        !Number.isInteger(data.discountValue) ||
        data.discountValue < 1 ||
        data.discountValue > 999_999_999
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['discountValue'],
          message: 'Số tiền giảm là số nguyên từ 1 đến 999.999.999 đồng.',
        });
      }
      if (data.maxDiscountAmount != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['maxDiscountAmount'],
          message: 'Chỉ khuyến mãi theo phần trăm mới có số tiền giảm tối đa.',
        });
      }
    }

    if (data.startsAt && data.endsAt) {
      const start = new Date(data.startsAt).getTime();
      const end = new Date(data.endsAt).getTime();
      const isOrderValid =
        !Number.isNaN(start) && !Number.isNaN(end) ? end > start : data.endsAt > data.startsAt;
      if (!isOrderValid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endsAt'],
          message: 'Thời điểm kết thúc phải sau thời điểm bắt đầu.',
        });
      }
    }
  });

export type PromotionFormValues = z.infer<typeof promotionFormSchema>;
export type PromotionFormInput = z.input<typeof promotionFormSchema>;
