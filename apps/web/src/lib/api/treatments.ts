import { OwnerTreatmentsApi, TreatmentsApi } from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { callApi, callVoidApi } from './call';

/** Runs one TreatmentsApi call on the shared client and returns the envelope's data. */
export function callTreatments<T>(
  call: (api: TreatmentsApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  return callApi((client) => new TreatmentsApi(client), call);
}

/** Runs one OwnerTreatmentsApi call on the shared client and returns the envelope's data. */
export function callOwnerTreatments<T>(
  fn: (api: OwnerTreatmentsApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  return callApi((client) => new OwnerTreatmentsApi(client), fn);
}

/** Runs one OwnerTreatmentsApi call that returns void (e.g. 204 No Content). */
export function callOwnerTreatmentsVoid(
  fn: (api: OwnerTreatmentsApi) => Promise<unknown>,
): Promise<void> {
  return callVoidApi((client) => new OwnerTreatmentsApi(client), (api) => fn(api) as Promise<void>);
}
