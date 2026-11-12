import { CareApi } from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { callApi, callVoidApi } from './call';

/** Runs one CareApi call (UC-SPA-25, 27, 28) on the shared client with the staff member's Bearer. */
export function callCare<T>(call: (api: CareApi) => Promise<ApiResponse<T>>): Promise<T> {
  return callApi((client) => new CareApi(client), call);
}

/** Runs one CareApi call that answers 204 No Content. */
export function callCareVoid(call: (api: CareApi) => Promise<void>): Promise<void> {
  return callVoidApi((client) => new CareApi(client), call);
}
