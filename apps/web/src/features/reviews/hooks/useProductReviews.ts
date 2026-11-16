import { useQuery } from '@tanstack/react-query';
import type { ProductReviews, ProductReviewParams } from '@spa/shared-types';
import {
  callProductReviews,
  reviewsQueryKeys,
  type ReviewedProductType,
} from '@/lib/api/reviews';

interface UseProductReviewsOptions {
  type: ReviewedProductType;
  id: string;
  params?: ProductReviewParams;
  enabled?: boolean;
}

export function useProductReviews({
  type,
  id,
  params = {},
  enabled = true,
}: UseProductReviewsOptions) {
  return useQuery<ProductReviews>({
    queryKey: reviewsQueryKeys.product(type, id, params),
    queryFn: ({ signal }) =>
      callProductReviews((api) => api.list(type, id, params, signal)),
    enabled: enabled && Boolean(id),
    staleTime: 60_000,
  });
}
