import { useQuery } from '@tanstack/react-query';
import type { ProductReviewParams, ProductReviews } from '@spa/shared-types';
import {
  callProductReviews,
  reviewsQueryKeys,
  type ReviewedProductType,
} from '@/lib/api/reviews';

interface UseProductReviewsOptions {
  type: ReviewedProductType;
  id: string;
  rating?: number;
  pageNumber?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useProductReviews({
  type,
  id,
  rating,
  pageNumber = 1,
  pageSize = 5,
  enabled = true,
}: UseProductReviewsOptions) {
  const params: ProductReviewParams = {
    rating,
    pageNumber,
    pageSize,
  };

  return useQuery<ProductReviews>({
    queryKey: reviewsQueryKeys.product(type, id, params),
    queryFn: ({ signal }) =>
      callProductReviews((api) => api.list(type, id, params, signal)),
    enabled: Boolean(id) && enabled,
    staleTime: 60_000,
  });
}
