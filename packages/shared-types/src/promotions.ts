import type { PaginationParams } from './index';

export type DiscountType = 'percentage' | 'fixed_amount';
export type PromotionStatus = 'active' | 'stopped';

export interface PromotionDto {
  id: string;
  code: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  startsAtUtc: string;
  endsAtUtc: string;
  perCustomerLimit: number | null;
  usageLimit: number | null;
  status: PromotionStatus;
  usedCount: number;
}

export interface SavePromotionRequest {
  code?: string | null;
  description?: string | null;
  discountType?: DiscountType | null;
  discountValue?: number | null;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  startsAtUtc?: string | null;
  endsAtUtc?: string | null;
  perCustomerLimit?: number | null;
  usageLimit?: number | null;
}

export interface ChangePromotionStatusRequest {
  status?: PromotionStatus | null;
}

export interface PromotionSearchParams extends PaginationParams {
  status?: PromotionStatus;
  fromDate?: string;
  toDate?: string;
}
