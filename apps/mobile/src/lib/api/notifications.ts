import {
  MyNotificationsApi,
  notificationQueryKeys,
  notificationErrorCodes,
} from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { getApiClient } from './session';

export function getMyNotificationsApi(): { api?: MyNotificationsApi; error?: string } {
  const { client, error } = getApiClient();
  return client ? { api: new MyNotificationsApi(client) } : { error };
}

export async function callMyNotifications<T>(
  call: (api: MyNotificationsApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  const { api, error } = getMyNotificationsApi();
  if (!api) throw new Error(error ?? 'Configuration Error');
  const response = await call(api);
  if (response.data === null || response.data === undefined) {
    throw new Error('Empty API response.');
  }
  return response.data;
}

export async function callMyNotificationsVoid(
  call: (api: MyNotificationsApi) => Promise<void>,
): Promise<void> {
  const { api, error } = getMyNotificationsApi();
  if (!api) throw new Error(error ?? 'Configuration Error');
  await call(api);
}

export { notificationQueryKeys, notificationErrorCodes };
