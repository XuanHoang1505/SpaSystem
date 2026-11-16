import { useQuery } from '@tanstack/react-query';
import type { OwnerReview, OwnerReviewFilter, PagedResponse } from '@spa/shared-types';
import { callReviews, reviewsQueryKeys } from '@/lib/api/reviews';

export interface UseOwnerReviewsOptions {
  filter?: OwnerReviewFilter;
  enabled?: boolean;
}

export function useOwnerReviews(optionsOrFilter: UseOwnerReviewsOptions | OwnerReviewFilter = {}) {
  const isOptions = 'filter' in optionsOrFilter || 'enabled' in optionsOrFilter;
  const filter: OwnerReviewFilter = isOptions
    ? (optionsOrFilter as UseOwnerReviewsOptions).filter ?? {}
    : (optionsOrFilter as OwnerReviewFilter);
  const enabled = isOptions ? (optionsOrFilter as UseOwnerReviewsOptions).enabled ?? true : true;

  return useQuery<PagedResponse<OwnerReview>>({
    queryKey: reviewsQueryKeys.owner(filter),
    queryFn: ({ signal }) =>
      callReviews((api) => api.search(filter, { signal })),
    enabled,
    staleTime: 30_000,
  });
}
