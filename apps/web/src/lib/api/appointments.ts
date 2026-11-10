import { AppointmentsApi, AvailabilityApi, OwnerAppointmentsApi, StaffApi } from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { callApi } from './call';

/** Runs one AppointmentsApi call on the shared client and returns the envelope's data. */
export function callAppointments<T>(
  call: (api: AppointmentsApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  return callApi((client) => new AppointmentsApi(client), call);
}

/** Runs one OwnerAppointmentsApi call (UC-SPA-17) on the shared client with the owner's Bearer. */
export function callOwnerAppointments<T>(
  call: (api: OwnerAppointmentsApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  return callApi((client) => new OwnerAppointmentsApi(client), call);
}

/** Runs one StaffApi call on the shared client (the owner's Bearer is attached when signed in). */
export function callStaff<T>(call: (api: StaffApi) => Promise<ApiResponse<T>>): Promise<T> {
  return callApi((client) => new StaffApi(client), call);
}

/** Runs one AvailabilityApi call on the shared client (the customer's Bearer is attached when signed in). */
export function callAvailability<T>(
  call: (api: AvailabilityApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  return callApi((client) => new AvailabilityApi(client), call);
}
