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

/**
 * Runs one call on a feature API that returns void (e.g. 204 No Content).
 */
export async function callVoidApi<TApi>(
  create: (client: ApiClient) => TApi,
  call: (api: TApi) => Promise<void>,
): Promise<void> {
  const { client, error } = getApiClient();
  if (!client) throw new ApiConfigurationError(error ?? 'Configuration Error');
  await call(create(client));
}

/**
 * Runs one call on a feature API that returns a Blob (e.g. binary file download/export).
 */
export async function callBlobApi<TApi>(
  create: (client: ApiClient) => TApi,
  call: (api: TApi) => Promise<Blob>,
): Promise<Blob> {
  const { client, error } = getApiClient();
  if (!client) throw new ApiConfigurationError(error ?? 'Configuration Error');
  return await call(create(client));
}

