import { ApiClientError } from '@spa/api-client';

/**
 * Retry policy of orders queries: 4xx (e.g. 404 not found, 400 validation error, 409) is final;
 * transient network or 5xx server errors get at most 1 retry.
 */
export function ordersRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiClientError && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < 1;
}
