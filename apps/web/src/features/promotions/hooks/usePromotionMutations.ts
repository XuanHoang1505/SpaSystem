import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ChangePromotionStatusRequest,
  PromotionDto,
  SavePromotionRequest,
} from '@spa/shared-types';
import { callPromotions, callPromotionsVoid } from '@/lib/api/promotions';
import { promotionQueryKeys } from '../promotionQueryKeys';

export function useCreatePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SavePromotionRequest) => callPromotions((api) => api.create(body)),
    onSuccess: (detail: PromotionDto) => {
      queryClient.setQueryData(promotionQueryKeys.detail(detail.id), detail);
      queryClient.invalidateQueries({ queryKey: promotionQueryKeys.all });
    },
  });
}

export function useUpdatePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SavePromotionRequest }) =>
      callPromotions((api) => api.update(id, body)),
    onSuccess: (detail: PromotionDto, { id }) => {
      queryClient.setQueryData(promotionQueryKeys.detail(id), detail);
      queryClient.invalidateQueries({ queryKey: promotionQueryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: promotionQueryKeys.all });
    },
  });
}

export function useChangePromotionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ChangePromotionStatusRequest }) =>
      callPromotionsVoid((api) => api.changeStatus(id, body)),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: promotionQueryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: promotionQueryKeys.all });
    },
  });
}
