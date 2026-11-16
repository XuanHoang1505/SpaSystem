import { useQueries, useQuery } from '@tanstack/react-query';
import { ProductReviewsApi, StaffApi, reviewsQueryKeys } from '@spa/api-client';
import type { ServiceListItem } from '@spa/shared-types';
import { catalogRetry, useCatalogQueryEnabled } from '@/features/services';
import { callApi } from '@/lib/api/call';
import type { HomeReview } from '../homeDemoContent';

const teamSize = 4;
const reviewedServices = 3;
const reviewsPerService = 3;
const maxReviews = 6;

/** Working staff for the team block (`GET /staff`, public: name, specialty, avatar, verified certifications). */
export function useHomeTeam() {
  const enabled = useCatalogQueryEnabled();
  return useQuery({
    queryKey: ['staff', 'public', 'home', teamSize] as const,
    queryFn: ({ signal }) =>
      callApi(
        (client) => new StaffApi(client),
        (api) => api.listPublic({ pageSize: teamSize }, signal),
      ),
    retry: catalogRetry,
    enabled,
  });
}

/**
 * The newest visible reviews with a comment, gathered from the most reviewed services (there is no site-wide review
 * endpoint yet). Also returns the overall average weighted by review count.
 */
export function useHomeReviews(services: readonly ServiceListItem[]) {
  const enabled = useCatalogQueryEnabled();
  const picked = [...services]
    .filter((service) => service.reviewCount > 0)
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, reviewedServices);

  const queries = useQueries({
    queries: picked.map((service) => {
      const params = { pageNumber: 1, pageSize: reviewsPerService };
      return {
        queryKey: reviewsQueryKeys.product('service', service.id, params),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          callApi(
            (client) => new ProductReviewsApi(client),
            (api) => api.list('service', service.id, params, signal),
          ),
        retry: catalogRetry,
        enabled,
      };
    }),
  });

  const reviews: HomeReview[] = queries
    .flatMap((query, index) =>
      (query.data?.page.items ?? []).map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment?.trim() ?? '',
        reviewerName: review.reviewerName,
        serviceName: picked[index]?.name ?? '',
        createdAtUtc: review.createdAtUtc,
      })),
    )
    .filter((review) => review.comment.length > 0)
    .sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc))
    .slice(0, maxReviews);

  const rated = services.filter(
    (service) => service.averageRating !== null && service.reviewCount > 0,
  );
  const reviewCount = rated.reduce((sum, service) => sum + service.reviewCount, 0);
  const averageRating =
    reviewCount > 0
      ? rated.reduce(
          (sum, service) => sum + (service.averageRating ?? 0) * service.reviewCount,
          0,
        ) / reviewCount
      : null;

  return {
    reviews,
    averageRating,
    reviewCount,
    isPending: queries.some((query) => query.isPending),
  };
}
