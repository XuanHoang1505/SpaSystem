import { PromotionsApi } from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { callApi, callVoidApi } from './call';

/** Runs one PromotionsApi call on the shared client and returns the envelope's data. */
export function callPromotions<T>(
  call: (api: PromotionsApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  return callApi((client) => new PromotionsApi(client), call);
}

/** Runs one PromotionsApi call that returns void (e.g. 204 No Content). */
export function callPromotionsVoid(
  call: (api: PromotionsApi) => Promise<unknown>,
): Promise<void> {
  return callVoidApi((client) => new PromotionsApi(client), (api) => call(api) as Promise<void>);
}
