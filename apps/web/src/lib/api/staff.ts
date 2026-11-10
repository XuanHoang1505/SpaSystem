import { StaffApi } from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { callApi, callVoidApi } from './call';

/** Runs one StaffApi call on the shared client and returns the envelope's data. */
export function callStaff<T>(call: (api: StaffApi) => Promise<ApiResponse<T>>): Promise<T> {
  return callApi((client) => new StaffApi(client), call);
}

/** Runs one StaffApi call that returns void (e.g. 204 No Content). */
export function callStaffVoid(call: (api: StaffApi) => Promise<void>): Promise<void> {
  return callVoidApi((client) => new StaffApi(client), call);
}
