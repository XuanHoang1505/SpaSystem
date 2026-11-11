import type { DiscountType, PromotionStatus } from '@spa/shared-types';
import type { StatusTone } from '@/components/shared/StatusBadge/StatusBadge';
import { formatCurrency } from '@/lib/formatting/formatters';

export const promotionStatusBadge: Record<PromotionStatus, { label: string; tone: StatusTone }> = {
  active: { label: 'Đang áp dụng', tone: 'success' },
  stopped: { label: 'Tạm dừng', tone: 'neutral' },
};

/** Kiểm tra khuyến mãi đã qua thời điểm kết thúc hay chưa. */
export function isPromotionExpired(endsAtUtc: string): boolean {
  const timestamp = new Date(endsAtUtc).getTime();
  return !Number.isNaN(timestamp) && timestamp <= Date.now();
}

/** Định dạng mức giảm giá khuyến mãi theo % hoặc số tiền. */
export function formatPromotionDiscount(
  type: DiscountType,
  value: number,
  maxDiscountAmount?: number | null,
): string {
  if (type === 'percentage') {
    if (maxDiscountAmount != null && maxDiscountAmount > 0) {
      return `${value}% (tối đa ${formatCurrency(maxDiscountAmount)})`;
    }
    return `${value}%`;
  }
  return formatCurrency(value);
}
