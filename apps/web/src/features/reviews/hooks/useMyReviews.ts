import { useQuery } from '@tanstack/react-query';
import type { MyReview, PagedResponse, MyReviewParams } from '@spa/shared-types';
import { callMyReviews, reviewsQueryKeys } from '@/lib/api/reviews';

export interface UseMyReviewsOptions {
  params?: MyReviewParams;
  pageNumber?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useMyReviews(options: UseMyReviewsOptions = {}) {
  const { enabled = true } = options;
  const params: MyReviewParams = options.params ?? {
    pageNumber: options.pageNumber,
    pageSize: options.pageSize,
  };

  return useQuery<PagedResponse<MyReview>>({
    queryKey: reviewsQueryKeys.mine(params),
    queryFn: ({ signal }) =>
      callMyReviews((api) => api.listMine(params, { signal })),
    enabled,
    staleTime: 30_000,
  });
}
