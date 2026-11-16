import { useQuery } from '@tanstack/react-query';
import type { MyReview, PagedResponse } from '@spa/shared-types';
import { callMyReviews, reviewsQueryKeys } from '@/lib/api/reviews';

interface UseMyReviewsOptions {
  pageNumber?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useMyReviews({
  pageNumber = 1,
  pageSize = 10,
  enabled = true,
}: UseMyReviewsOptions = {}) {
  const params = { pageNumber, pageSize };

  return useQuery<PagedResponse<MyReview>>({
    queryKey: reviewsQueryKeys.mine(params),
    queryFn: ({ signal }) =>
      callMyReviews((api) => api.listMine(params, { signal })),
    enabled,
    staleTime: 30_000,
  });
}
