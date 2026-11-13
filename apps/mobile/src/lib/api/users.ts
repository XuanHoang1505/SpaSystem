import { UsersApi, usersQueryKeys } from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { getApiClient } from './session';

export function getUsersApi(): { api?: UsersApi; error?: string } {
  const { client, error } = getApiClient();
  return client ? { api: new UsersApi(client) } : { error };
}

/** Runs one UsersApi call and returns the envelope's data. */
export async function callUsers<T>(
  call: (api: UsersApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  const { api, error } = getUsersApi();
  if (!api) throw new Error(error ?? 'Configuration Error');
  const response = await call(api);
  if (response.data === null || response.data === undefined) {
    throw new Error('Empty API response.');
  }
  return response.data;
}

/** Runs one UsersApi call that answers 204, such as password change or avatar delete. */
export async function callUsersVoid(call: (api: UsersApi) => Promise<void>): Promise<void> {
  const { api, error } = getUsersApi();
  if (!api) throw new Error(error ?? 'Configuration Error');
  await call(api);
}

export { usersQueryKeys };
