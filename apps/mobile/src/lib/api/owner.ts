import {
  OwnerAppointmentsApi,
  StaffApi,
  WorkSchedulesApi,
  ownerAppointmentsQueryKeys,
  staffQueryKeys,
  workSchedulesQueryKeys,
} from '@spa/api-client';
import type { ApiResponse } from '@spa/shared-types';
import { getApiClient } from './session';

/** Owner-only APIs on mobile: every appointment (UC-SPA-17), the staff list (UC-SPA-22) and shifts (UC-SPA-23). */
async function unwrap<T>(promise: Promise<ApiResponse<T>>): Promise<T> {
  const response = await promise;
  if (response.data === null || response.data === undefined) throw new Error('Empty API response.');
  return response.data;
}

export function callOwnerAppointments<T>(
  call: (api: OwnerAppointmentsApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  const { client, error } = getApiClient();
  if (!client) return Promise.reject(new Error(error ?? 'Configuration Error'));
  return unwrap(call(new OwnerAppointmentsApi(client)));
}

export function callStaff<T>(call: (api: StaffApi) => Promise<ApiResponse<T>>): Promise<T> {
  const { client, error } = getApiClient();
  if (!client) return Promise.reject(new Error(error ?? 'Configuration Error'));
  return unwrap(call(new StaffApi(client)));
}

export function callWorkSchedules<T>(
  call: (api: WorkSchedulesApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  const { client, error } = getApiClient();
  if (!client) return Promise.reject(new Error(error ?? 'Configuration Error'));
  return unwrap(call(new WorkSchedulesApi(client)));
}

export { ownerAppointmentsQueryKeys, staffQueryKeys, workSchedulesQueryKeys };
