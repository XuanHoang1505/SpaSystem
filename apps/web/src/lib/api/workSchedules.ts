import { WorkSchedulesApi } from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { callApi, callVoidApi } from './call';

/** Runs one WorkSchedulesApi call on the shared client and returns the envelope's data. */
export function callWorkSchedules<T>(
  call: (api: WorkSchedulesApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  return callApi((client) => new WorkSchedulesApi(client), call);
}

/** Runs one WorkSchedulesApi call that returns void (e.g. 204 No Content). */
export function callWorkSchedulesVoid(
  call: (api: WorkSchedulesApi) => Promise<void>,
): Promise<void> {
  return callVoidApi((client) => new WorkSchedulesApi(client), call);
}
