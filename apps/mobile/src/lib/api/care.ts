import { CareApi, careErrorCodes, careQueryKeys } from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { getApiClient } from './session';

/**
 * Access the shared CareApi instance for mobile.
 * Uses the shared ApiClient with authentication headers attached.
 */
export function getCareApi(): { api?: CareApi; error?: string } {
  const { client, error } = getApiClient();
  return client ? { api: new CareApi(client) } : { error };
}

/** Runs one CareApi call and returns the unwrapped data payload. */
export async function callCare<T>(call: (api: CareApi) => Promise<ApiResponse<T>>): Promise<T> {
  const { api, error } = getCareApi();
  if (!api) throw new Error(error ?? 'Configuration Error');
  const response = await call(api);
  if (response.data === null || response.data === undefined) {
    throw new Error('Empty API response.');
  }
  return response.data;
}

/** Runs one CareApi call that returns 204 No Content. */
export async function callCareVoid(call: (api: CareApi) => Promise<void>): Promise<void> {
  const { api, error } = getCareApi();
  if (!api) throw new Error(error ?? 'Configuration Error');
  await call(api);
}

export { careQueryKeys, careErrorCodes };
