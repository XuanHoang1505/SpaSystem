import {
  ServiceHistoryApi,
  serviceHistoryQueryKeys,
  serviceHistoryErrorCodes,
  type ServiceHistoryParams,
} from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { getApiClient } from './session';

export function getServiceHistoryApi(): { api?: ServiceHistoryApi; error?: string } {
  const { client, error } = getApiClient();
  return client ? { api: new ServiceHistoryApi(client) } : { error };
}

export async function callServiceHistory<T>(
  call: (api: ServiceHistoryApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  const { api, error } = getServiceHistoryApi();
  if (!api) throw new Error(error ?? 'Configuration Error');
  const response = await call(api);
  if (response.data === null || response.data === undefined) {
    throw new Error('Empty API response.');
  }
  return response.data;
}

export { serviceHistoryQueryKeys, serviceHistoryErrorCodes };
export type { ServiceHistoryParams };
