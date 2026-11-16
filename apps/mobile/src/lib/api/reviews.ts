import {
  ProductReviewsApi,
  MyReviewsApi,
  reviewsQueryKeys,
  reviewErrorCodes,
  type ReviewedProductType,
  type ReviewUploadFile,
} from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { getApiClient } from './session';

/**
 * Access the shared ProductReviewsApi instance for mobile.
 */
export function getProductReviewsApi(): { api?: ProductReviewsApi; error?: string } {
  const { client, error } = getApiClient();
  return client ? { api: new ProductReviewsApi(client) } : { error };
}

/** Runs one ProductReviewsApi call and returns the unwrapped data payload. */
export async function callProductReviews<T>(
  call: (api: ProductReviewsApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  const { api, error } = getProductReviewsApi();
  if (!api) throw new Error(error ?? 'Configuration Error');
  const response = await call(api);
  if (response.data === null || response.data === undefined) {
    throw new Error('Empty API response.');
  }
  return response.data;
}

/**
 * Access the shared MyReviewsApi instance for mobile.
 */
export function getMyReviewsApi(): { api?: MyReviewsApi; error?: string } {
  const { client, error } = getApiClient();
  return client ? { api: new MyReviewsApi(client) } : { error };
}

/** Runs one MyReviewsApi call and returns the unwrapped data payload. */
export async function callMyReviews<T>(
  call: (api: MyReviewsApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  const { api, error } = getMyReviewsApi();
  if (!api) throw new Error(error ?? 'Configuration Error');
  const response = await call(api);
  if (response.data === null || response.data === undefined) {
    throw new Error('Empty API response.');
  }
  return response.data;
}

/** Runs one MyReviewsApi void call (like delete). */
export async function callMyReviewsVoid(
  call: (api: MyReviewsApi) => Promise<void>,
): Promise<void> {
  const { api, error } = getMyReviewsApi();
  if (!api) throw new Error(error ?? 'Configuration Error');
  await call(api);
}

export {
  reviewsQueryKeys,
  reviewErrorCodes,
  type ReviewedProductType,
  type ReviewUploadFile,
};
