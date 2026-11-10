import { TreatmentsApi } from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { callApi } from './call';

/** Runs one TreatmentsApi call on the shared client and returns the envelope's data. */
export function callTreatments<T>(
  call: (api: TreatmentsApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  return callApi((client) => new TreatmentsApi(client), call);
}
