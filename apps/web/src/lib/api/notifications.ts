import {
  MyNotificationsApi,
  notificationQueryKeys,
  notificationErrorCodes,
} from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { callApi, callVoidApi } from './call';

/** UC-SPA-34: Calls MyNotificationsApi on the shared client. */
export function callMyNotifications<T>(
  call: (api: MyNotificationsApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  return callApi((client) => new MyNotificationsApi(client), call);
}

/** UC-SPA-34: Calls MyNotificationsApi for endpoints returning void (204 No Content). */
export function callMyNotificationsVoid(
  call: (api: MyNotificationsApi) => Promise<void>,
): Promise<void> {
  return callVoidApi((client) => new MyNotificationsApi(client), call);
}

export { notificationQueryKeys, notificationErrorCodes };
