import { PurchasesApi } from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { callApi } from './call';

/** Runs one PurchasesApi call on the shared client and returns the envelope's data. */
export function callPurchases<T>(call: (api: PurchasesApi) => Promise<ApiResponse<T>>): Promise<T> {
  return callApi((client) => new PurchasesApi(client), call);
}
