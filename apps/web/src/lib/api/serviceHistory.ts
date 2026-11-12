import { ServiceHistoryApi } from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { callApi } from './call';

/** Runs one ServiceHistoryApi call on the shared client and returns the envelope's data. */
export function callServiceHistory<T>(
  call: (api: ServiceHistoryApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  return callApi((client) => new ServiceHistoryApi(client), call);
}
