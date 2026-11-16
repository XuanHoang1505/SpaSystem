import {
  MyWorkSchedulesApi,
  myWorkSchedulesQueryKeys,
  workScheduleErrorCodes,
} from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { getApiClient } from './session';

/**
 * Access the shared MyWorkSchedulesApi instance for mobile.
 * Uses the shared ApiClient with authentication headers attached.
 */
export function getMyWorkSchedulesApi(): { api?: MyWorkSchedulesApi; error?: string } {
  const { client, error } = getApiClient();
  return client ? { api: new MyWorkSchedulesApi(client) } : { error };
}

/** Runs one MyWorkSchedulesApi call and returns the unwrapped data payload. */
export async function callMyWorkSchedules<T>(
  call: (api: MyWorkSchedulesApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  const { api, error } = getMyWorkSchedulesApi();
  if (!api) throw new Error(error ?? 'Configuration Error');
  const response = await call(api);
  if (response.data === null || response.data === undefined) {
    throw new Error('Empty API response.');
  }
  return response.data;
}

export { myWorkSchedulesQueryKeys, workScheduleErrorCodes };
