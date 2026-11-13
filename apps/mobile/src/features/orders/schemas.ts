import { z } from 'zod';

export const promotionCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(1, 'Vui lòng nhập mã khuyến mãi')
  .max(50, 'Mã khuyến mãi không vượt quá 50 ký tự');

export type PromotionCodeFormValues = {
  promotionCode: string;
};
