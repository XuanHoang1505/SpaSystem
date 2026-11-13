import { CatalogApi } from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { getApiClient } from './session';

/**
 * Access the shared CatalogApi instance for mobile.
 * Uses the shared ApiClient with authentication headers attached if the user has an active session.
 */
export function getCatalogApi(): { api?: CatalogApi; error?: string } {
  const { client, error } = getApiClient();
  return client ? { api: new CatalogApi(client) } : { error };
}

/** Runs one CatalogApi call and returns the unwrapped data payload. */
export async function callCatalog<T>(
  call: (api: CatalogApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  const { api, error } = getCatalogApi();
  if (!api) throw new Error(error ?? 'Configuration Error');
  const response = await call(api);
  if (response.data === null || response.data === undefined) {
    throw new Error('Empty API response.');
  }
  return response.data;
}
