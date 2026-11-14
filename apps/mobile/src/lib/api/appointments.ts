import {
  AppointmentsApi,
  AvailabilityApi,
  PurchasesApi,
  TreatmentsApi,
  appointmentErrorCodes,
  appointmentsQueryKeys,
  availabilityQueryKeys,
  purchasesQueryKeys,
  treatmentsQueryKeys,
} from '@spa/api-client';
import type { AvailabilitySource } from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { getApiClient } from './session';

function unwrapResponse<T>(response: ApiResponse<T>): T {
  if (response.data === null || response.data === undefined) {
    throw new Error('Empty API response.');
  }
  return response.data;
}

export function getAppointmentsApi(): { api?: AppointmentsApi; error?: string } {
  const { client, error } = getApiClient();
  return client ? { api: new AppointmentsApi(client) } : { error };
}

export async function callAppointments<T>(
  call: (api: AppointmentsApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  const { api, error } = getAppointmentsApi();
  if (!api) throw new Error(error ?? 'Configuration Error');
  return unwrapResponse(await call(api));
}

export function getAvailabilityApi(): { api?: AvailabilityApi; error?: string } {
  const { client, error } = getApiClient();
  return client ? { api: new AvailabilityApi(client) } : { error };
}

export async function callAvailability<T>(
  call: (api: AvailabilityApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  const { api, error } = getAvailabilityApi();
  if (!api) throw new Error(error ?? 'Configuration Error');
  return unwrapResponse(await call(api));
}

export function getPurchasesApi(): { api?: PurchasesApi; error?: string } {
  const { client, error } = getApiClient();
  return client ? { api: new PurchasesApi(client) } : { error };
}

export async function callPurchases<T>(
  call: (api: PurchasesApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  const { api, error } = getPurchasesApi();
  if (!api) throw new Error(error ?? 'Configuration Error');
  return unwrapResponse(await call(api));
}

export function getTreatmentsApi(): { api?: TreatmentsApi; error?: string } {
  const { client, error } = getApiClient();
  return client ? { api: new TreatmentsApi(client) } : { error };
}

export async function callTreatments<T>(
  call: (api: TreatmentsApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  const { api, error } = getTreatmentsApi();
  if (!api) throw new Error(error ?? 'Configuration Error');
  return unwrapResponse(await call(api));
}

export {
  appointmentErrorCodes,
  appointmentsQueryKeys,
  availabilityQueryKeys,
  purchasesQueryKeys,
  treatmentsQueryKeys,
};
export type { AvailabilitySource };
