import {
  ProductReviewsApi,
  MyReviewsApi,
  ReviewsApi,
  reviewsQueryKeys,
  reviewErrorCodes,
  type ReviewedProductType,
  type ReviewUploadFile,
} from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { callApi, callVoidApi } from './call';

/** UC-SPA-29: Calls ProductReviewsApi on the shared client. */
export function callProductReviews<T>(
  call: (api: ProductReviewsApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  return callApi((client) => new ProductReviewsApi(client), call);
}

/** UC-SPA-30: Calls MyReviewsApi on the shared client with the customer's credentials. */
export function callMyReviews<T>(
  call: (api: MyReviewsApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  return callApi((client) => new MyReviewsApi(client), call);
}

/** UC-SPA-30: Calls MyReviewsApi for endpoints returning void (204 No Content). */
export function callMyReviewsVoid(
  call: (api: MyReviewsApi) => Promise<void>,
): Promise<void> {
  return callVoidApi((client) => new MyReviewsApi(client), call);
}

/** UC-SPA-31: Calls ReviewsApi on the shared client with the owner's credentials. */
export function callReviews<T>(
  call: (api: ReviewsApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  return callApi((client) => new ReviewsApi(client), call);
}

/** UC-SPA-31: Calls ReviewsApi for endpoints returning void (204 No Content). */
export function callReviewsVoid(
  call: (api: ReviewsApi) => Promise<void>,
): Promise<void> {
  return callVoidApi((client) => new ReviewsApi(client), call);
}

export {
  reviewsQueryKeys,
  reviewErrorCodes,
  type ReviewedProductType,
  type ReviewUploadFile,
};
