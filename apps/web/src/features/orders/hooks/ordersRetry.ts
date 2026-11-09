import { ApiClientError } from '@spa/api-client';
import { ApiConfigurationError } from '@/lib/errors/ApiConfigurationError';

/** A 4xx answer or a missing configuration is final; network and server errors keep one retry. */
export function ordersRetry(failureCount: number, error: Error) {
  if (error instanceof ApiConfigurationError) return false;
  if (error instanceof ApiClientError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 1;
}
