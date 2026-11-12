import type { PromotionSearchParams } from '@spa/shared-types';

export const promotionQueryKeys = {
  all: ['promotions'] as const,
  lists: () => ['promotions', 'list'] as const,
  list: (params?: PromotionSearchParams) => ['promotions', 'list', params] as const,
  details: () => ['promotions', 'detail'] as const,
  detail: (id: string) => ['promotions', 'detail', id] as const,
};
