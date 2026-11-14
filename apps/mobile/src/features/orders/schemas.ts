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

export const cancelOrderSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập lý do hủy đơn hàng.')
    .max(500, 'Lý do hủy không vượt quá 500 ký tự.'),
});

export const quickOrderCancellationReasons = [
  'Đổi ý không mua nữa',
  'Muốn thay đổi sản phẩm/dịch vụ',
  'Chọn nhầm phương thức thanh toán',
  'Bận đột xuất, không thể đến theo lịch hẹn',
] as const;

