import { z } from 'zod';

export const PROMOTION_CODE_MAX = 50;

/** Promotion code typed at checkout (BR-PRM-04: trimmed, upper-case; UC-SPA-11 E9: at most 50 characters). */
export const promotionCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập mã khuyến mãi.')
    .max(PROMOTION_CODE_MAX, `Mã khuyến mãi tối đa ${PROMOTION_CODE_MAX} ký tự.`)
    .transform((value) => value.toUpperCase()),
});

export type PromotionCodeValues = z.input<typeof promotionCodeSchema>;

export const CANCEL_REASON_MAX = 500;

/** Reason to cancel an unpaid order (Q-43: required, 1-500 characters after trimming). */
export const cancelOrderSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập lý do hủy.')
    .max(CANCEL_REASON_MAX, `Lý do hủy tối đa ${CANCEL_REASON_MAX} ký tự.`),
});

export type CancelOrderValues = z.input<typeof cancelOrderSchema>;
