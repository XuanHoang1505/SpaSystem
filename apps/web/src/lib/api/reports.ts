import { ReportsApi } from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { callApi, callBlobApi } from './call';

/** Runs one ReportsApi call on the shared client and returns the envelope's data. */
export function callReports<T>(
  fn: (api: ReportsApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  return callApi((client) => new ReportsApi(client), fn);
}

/** Runs one ReportsApi call that returns a Blob (e.g. Excel export). */
export function callReportsBlob(
  fn: (api: ReportsApi) => Promise<Blob>,
): Promise<Blob> {
  return callBlobApi((client) => new ReportsApi(client), fn);
}
