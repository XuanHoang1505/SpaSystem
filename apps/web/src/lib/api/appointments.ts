import { AppointmentsApi, AvailabilityApi } from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { callApi } from './call';

/** Runs one AppointmentsApi call on the shared client and returns the envelope's data. */
export function callAppointments<T>(
  call: (api: AppointmentsApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  return callApi((client) => new AppointmentsApi(client), call);
}

/** Runs one AvailabilityApi call on the shared client (the customer's Bearer is attached when signed in). */
export function callAvailability<T>(
  call: (api: AvailabilityApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  return callApi((client) => new AvailabilityApi(client), call);
}
