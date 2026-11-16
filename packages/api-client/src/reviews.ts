import type {
  ApiResponse,
  PagedResponse,
  ProductReviewParams,
  ProductReviews,
  ReviewableProduct,
  MyReview,
  MyReviewParams,
  CreateReviewRequest,
  UpdateReviewRequest,
  OwnerReview,
  OwnerReviewFilter,
  ReplyReviewRequest,
  ChangeReviewVisibilityRequest,
} from '@spa/shared-types';
import type { ApiClient, RequestOptions } from './index';

export type ReviewedProductType = 'service' | 'package';

/** A browser `File`/`Blob`, or the `{ uri, name, type }` part React Native puts on `FormData`. */
export type ReviewUploadFile = Blob | { uri: string; name: string; type: string };

export const reviewErrorCodes = {
  notFound: 'review_not_found',
  notEligible: 'review_not_eligible',
  exists: 'review_exists',
  locked: 'review_locked',
} as const;

export const reviewsQueryKeys = {
  all: ['reviews'] as const,
  product: (type: ReviewedProductType, id: string, params: ProductReviewParams = {}) =>
    ['reviews', 'product', type, id, params] as const,
  reviewable: () => ['reviews', 'me', 'reviewable'] as const,
  mine: (params: MyReviewParams = {}) => ['reviews', 'me', 'list', params] as const,
  detail: (id: string) => ['reviews', 'me', 'detail', id] as const,
  owner: (filter: OwnerReviewFilter = {}) => ['reviews', 'owner', 'list', filter] as const,
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

/** UC-SPA-30: the signed-in customer's reviews. */
export class MyReviewsApi {
  constructor(private readonly client: ApiClient) {}

  listReviewable(options?: RequestOptions): Promise<ApiResponse<readonly ReviewableProduct[]>> {
    return this.client.get<ApiResponse<readonly ReviewableProduct[]>>('/api/v1/me/reviewable', options);
  }

  listMine(params: MyReviewParams = {}, options?: RequestOptions): Promise<ApiResponse<PagedResponse<MyReview>>> {
    return this.client.get<ApiResponse<PagedResponse<MyReview>>>('/api/v1/me/reviews', {
      query: { ...params },
      ...options,
    });
  }

  getMine(id: string, options?: RequestOptions): Promise<ApiResponse<MyReview>> {
    return this.client.get<ApiResponse<MyReview>>(`/api/v1/me/reviews/${encodeURIComponent(id)}`, options);
  }

  create(body: CreateReviewRequest, options?: RequestOptions): Promise<ApiResponse<MyReview>> {
    return this.client.post<CreateReviewRequest, ApiResponse<MyReview>>('/api/v1/me/reviews', body, options);
  }

  update(id: string, body: UpdateReviewRequest, options?: RequestOptions): Promise<ApiResponse<MyReview>> {
    return this.client.put<UpdateReviewRequest, ApiResponse<MyReview>>(
      `/api/v1/me/reviews/${encodeURIComponent(id)}`,
      body,
      options,
    );
  }

  uploadImage(
    id: string,
    file: ReviewUploadFile,
    options?: RequestOptions,
  ): Promise<ApiResponse<MyReview>> {
    const formData = new FormData();
    const multipart = formData as {
      append(name: string, value: ReviewUploadFile): void;
    };
    multipart.append('file', file);
    return this.client.post<FormData, ApiResponse<MyReview>>(
      `/api/v1/me/reviews/${encodeURIComponent(id)}/image`,
      formData,
      options,
    );
  }

  deleteImage(id: string, options?: RequestOptions): Promise<void> {
    return this.client.delete<void>(`/api/v1/me/reviews/${encodeURIComponent(id)}/image`, options);
  }
}

/** UC-SPA-31: Owner reviews management. */
export class ReviewsApi {
  constructor(private readonly client: ApiClient) {}

  search(
    filter: OwnerReviewFilter = {},
    options?: RequestOptions,
  ): Promise<ApiResponse<PagedResponse<OwnerReview>>> {
    return this.client.get<ApiResponse<PagedResponse<OwnerReview>>>('/api/v1/reviews', {
      query: { ...filter },
      ...options,
    });
  }

  reply(
    id: string,
    body: ReplyReviewRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<OwnerReview>> {
    return this.client.post<ReplyReviewRequest, ApiResponse<OwnerReview>>(
      `/api/v1/reviews/${encodeURIComponent(id)}/reply`,
      body,
      options,
    );
  }

  removeReply(id: string, options?: RequestOptions): Promise<void> {
    return this.client.delete<void>(
      `/api/v1/reviews/${encodeURIComponent(id)}/reply`,
      options,
    );
  }

  changeVisibility(
    id: string,
    body: ChangeReviewVisibilityRequest,
    options?: RequestOptions,
  ): Promise<void> {
    return this.client.patch<ChangeReviewVisibilityRequest, void>(
      `/api/v1/reviews/${encodeURIComponent(id)}/visibility`,
      body,
      options,
    );
  }
}
