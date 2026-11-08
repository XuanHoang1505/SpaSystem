import { CatalogApi } from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { ApiConfigurationError } from '@/lib/errors/ApiConfigurationError';
import { getApiClient } from './session';

/** Shared client: an owner's Bearer makes the API include discontinued items (BR-CAT-01). */
function catalogApi(): CatalogApi {
  const { client, error } = getApiClient();
  if (!client) throw new ApiConfigurationError(error ?? 'Configuration Error');
  return new CatalogApi(client);
}

/** Runs one CatalogApi call and returns the envelope's data (a missing body is an error). */
export async function callCatalog<T>(
  call: (api: CatalogApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  const response = await call(catalogApi());
  if (response.data === null || response.data === undefined) throw new Error('Empty API response.');
  return response.data;
}
