import { ReportsApi, reportsQueryKeys, reportErrorCodes } from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { getApiClient } from './session';

/**
 * Access the shared ReportsApi instance for mobile.
 * Uses the shared ApiClient with authentication headers attached if the user has an active session.
 */
export function getReportsApi(): { api?: ReportsApi; error?: string } {
  const { client, error } = getApiClient();
  return client ? { api: new ReportsApi(client) } : { error };
}

/** Runs one ReportsApi call and returns the unwrapped data payload. */
export async function callReports<T>(
  call: (api: ReportsApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  const { api, error } = getReportsApi();
  if (!api) throw new Error(error ?? 'Configuration Error');
  const response = await call(api);
  if (response.data === null || response.data === undefined) {
    throw new Error('Empty API response.');
  }
  return response.data;
}

export { reportsQueryKeys, reportErrorCodes };
