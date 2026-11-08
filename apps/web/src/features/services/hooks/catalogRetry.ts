import { ApiClientError } from '@spa/api-client';
import { ApiConfigurationError } from '@/lib/errors/ApiConfigurationError';

/**
 * Retry policy of catalog queries: a 4xx answer (404 detail, 400 invalid filter) or a missing
 * configuration is final; network/server errors keep the default single retry.
 */
export function catalogRetry(failureCount: number, error: Error) {
  if (error instanceof ApiConfigurationError) return false;
  if (error instanceof ApiClientError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 1;
}
