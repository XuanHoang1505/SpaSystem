import type { AuthApi } from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { getAuthApi } from '@/lib/api/session';

function authApi(): AuthApi {
  const { api, error } = getAuthApi();
  if (!api) throw new Error(error);
  return api;
}

/** Runs one AuthApi call and returns the envelope's data (a missing body is an error). */
export async function callAuth<T>(call: (api: AuthApi) => Promise<ApiResponse<T>>): Promise<T> {
  const response = await call(authApi());
  if (response.data === null || response.data === undefined) throw new Error('Empty API response.');
  return response.data;
}

/** For 204 endpoints (logout, reset password). */
export const callAuthVoid = (call: (api: AuthApi) => Promise<void>) => call(authApi());
