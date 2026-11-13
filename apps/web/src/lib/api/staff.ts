import { MyCertificationsApi, StaffApi, StaffCertificationsApi } from '@spa/api-client';
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

/** Runs one StaffCertificationsApi call (owner, UC-SPA-22 bổ sung). */
export function callStaffCertifications<T>(
  call: (api: StaffCertificationsApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  return callApi((client) => new StaffCertificationsApi(client), call);
}

export function callStaffCertificationsVoid(
  call: (api: StaffCertificationsApi) => Promise<void>,
): Promise<void> {
  return callVoidApi((client) => new StaffCertificationsApi(client), call);
}

/** Runs one MyCertificationsApi call (the signed-in staff member). */
export function callMyCertifications<T>(
  call: (api: MyCertificationsApi) => Promise<ApiResponse<T>>,
): Promise<T> {
  return callApi((client) => new MyCertificationsApi(client), call);
}

export function callMyCertificationsVoid(
  call: (api: MyCertificationsApi) => Promise<void>,
): Promise<void> {
  return callVoidApi((client) => new MyCertificationsApi(client), call);
}
