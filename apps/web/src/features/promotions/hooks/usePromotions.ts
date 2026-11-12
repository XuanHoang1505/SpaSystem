import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { PromotionSearchParams } from '@spa/shared-types';
import { callPromotions } from '@/lib/api/promotions';
import { promotionQueryKeys } from '../promotionQueryKeys';

export function usePromotionSearch(params: PromotionSearchParams) {
  return useQuery({
    queryKey: promotionQueryKeys.list(params),
    queryFn: ({ signal }) => callPromotions((api) => api.search(params, signal)),
    placeholderData: keepPreviousData,
  });
}

export function usePromotion(id: string, enabled = true) {
  return useQuery({
    queryKey: promotionQueryKeys.detail(id),
    queryFn: ({ signal }) => callPromotions((api) => api.get(id, signal)),
    enabled: Boolean(id) && enabled,
  });
}
