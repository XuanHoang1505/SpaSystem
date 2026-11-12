import { OwnerUsersApi, UsersApi } from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { callApi, callVoidApi } from './call';

/** Runs one UsersApi call on the shared client and returns the envelope's data. */
export function callUsers<T>(call: (api: UsersApi) => Promise<ApiResponse<T>>): Promise<T> {
  return callApi((client) => new UsersApi(client), call);
}

/** Runs one UsersApi call that returns void (e.g. 204 No Content). */
export function callUsersVoid(call: (api: UsersApi) => Promise<void>): Promise<void> {
  return callVoidApi((client) => new UsersApi(client), call);
}

/** Runs one OwnerUsersApi call (UC-SPA-05) with the owner's Bearer. */
export function callOwnerUsers<T>(
  call: (api: OwnerUsersApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  return callApi((client) => new OwnerUsersApi(client), call);
}

/** Runs one OwnerUsersApi call that answers 204 No Content. */
export function callOwnerUsersVoid(call: (api: OwnerUsersApi) => Promise<void>): Promise<void> {
  return callVoidApi((client) => new OwnerUsersApi(client), call);
}
