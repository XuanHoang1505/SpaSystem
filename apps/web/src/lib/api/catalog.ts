import { CatalogApi } from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { callApi, callVoidApi } from './call';

/** Shared client: an owner's Bearer makes the API include discontinued items (BR-CAT-01). */
export function callCatalog<T>(call: (api: CatalogApi) => Promise<ApiResponse<T>>): Promise<T> {
  return callApi((client) => new CatalogApi(client), call);
}

/** Runs one CatalogApi call that returns void (e.g. 204 No Content). */
export function callCatalogVoid(call: (api: CatalogApi) => Promise<unknown>): Promise<void> {
  return callVoidApi((client) => new CatalogApi(client), (api) => call(api) as Promise<void>);
}
