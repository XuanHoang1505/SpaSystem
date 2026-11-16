import type { ApiResponse, ProductReviewParams, ProductReviews } from '@spa/shared-types';
import type { ApiClient } from './index';

export type ReviewedProductType = 'service' | 'package';

export const reviewsQueryKeys = {
  all: ['reviews'] as const,
  product: (type: ReviewedProductType, id: string, params: ProductReviewParams = {}) =>
    ['reviews', 'product', type, id, params] as const,
};

/** UC-SPA-29: the visible reviews of one service or package, for everyone (no sign-in needed). */
export class ProductReviewsApi {
  constructor(private readonly client: ApiClient) {}

  list(
    type: ReviewedProductType,
    id: string,
    params: ProductReviewParams = {},
    signal?: AbortSignal,
  ) {
    const base = type === 'service' ? '/api/v1/services' : '/api/v1/packages';
    return this.client.get<ApiResponse<ProductReviews>>(
      `${base}/${encodeURIComponent(id)}/reviews`,
      { query: { ...params }, signal },
    );
  }
}
