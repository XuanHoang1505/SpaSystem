import { useQuery } from '@tanstack/react-query';
import type { ReviewableProduct } from '@spa/shared-types';
import { callMyReviews, reviewsQueryKeys } from '@/lib/api/reviews';

export function useReviewableProducts(enabled = true) {
  return useQuery<readonly ReviewableProduct[]>({
    queryKey: reviewsQueryKeys.reviewable(),
    queryFn: ({ signal }) =>
      callMyReviews((api) => api.listReviewable({ signal })),
    enabled,
    staleTime: 30_000,
  });
}
