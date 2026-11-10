import { UsersApi } from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { callApi, callVoidApi } from './call';

/** Runs one UsersApi call on the shared client and returns the envelope's data. */
export function callUsers<T>(
  call: (api: UsersApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  return callApi((client) => new UsersApi(client), call);
}

/** Runs one UsersApi call that returns void (e.g. 204 No Content). */
export function callUsersVoid(
  call: (api: UsersApi) => Promise<void>,
): Promise<void> {
  return callVoidApi((client) => new UsersApi(client), call);
}
