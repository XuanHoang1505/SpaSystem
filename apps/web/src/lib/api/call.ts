import type { ApiClient } from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { ApiConfigurationError } from '@/lib/errors/ApiConfigurationError';
import { getApiClient } from './session';

/**
 * Runs one call on a feature API built from the shared client and returns the envelope's data. Missing configuration →
 * `ApiConfigurationError` (no network call); a missing body is an error.
 */
export async function callApi<TApi, T>(
  create: (client: ApiClient) => TApi,
  call: (api: TApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  const { client, error } = getApiClient();
  if (!client) throw new ApiConfigurationError(error ?? 'Configuration Error');
  const response = await call(create(client));
  if (response.data === null || response.data === undefined) throw new Error('Empty API response.');
  return response.data;
}
