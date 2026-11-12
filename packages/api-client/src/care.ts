import type {
  ApiResponse,
  AppointmentDetail,
  AssignedAppointment,
  AssignedAppointmentListParams,
  CareHistoryItem,
  CareHistoryParams,
  CompleteAppointmentResult,
  CustomerAllergy,
  PagedResponse,
  SaveAllergyRequest,
  SaveSkinProfileRequest,
  SkinProfile,
} from '@spa/shared-types';
import type { ApiClient } from './index';

const appointmentPath = (id: string, child?: string) =>
  `/api/v1/appointments/${encodeURIComponent(id)}${child ? `/${child}` : ''}`;
const allergiesPath = (customerId: string, allergyId?: string) =>
  `/api/v1/customers/${encodeURIComponent(customerId)}/allergies${
    allergyId ? `/${encodeURIComponent(allergyId)}` : ''
  }`;

/** Error codes of the staff care endpoints (docs/specs/care.md); branch on these, never on the message. */
export const careErrorCodes = {
  appointmentNotFound: 'appointment_not_found',
  appointmentNotAssigned: 'appointment_not_assigned',
  appointmentStatusInvalid: 'appointment_status_invalid',
  skinProfileTooEarly: 'skin_profile_too_early',
  skinProfileLocked: 'skin_profile_locked',
  skinProfileExists: 'skin_profile_exists',
  skinProfileNotFound: 'skin_profile_not_found',
  skinProfileRequired: 'skin_profile_required',
  completeTooEarly: 'complete_too_early',
  entitlementStateInvalid: 'entitlement_state_invalid',
  allergyExists: 'allergy_exists',
  allergyNotFound: 'allergy_not_found',
  customerNotInCare: 'customer_not_in_care',
  customerNotFound: 'customer_not_found',
  validationError: 'validation_error',
} as const;

/** UC-SPA-25, 27, 28: a staff member's assigned appointments, skin profiles, allergies and completion. */
export class CareApi {
  constructor(private readonly client: ApiClient) {}

  listAssigned(params: AssignedAppointmentListParams, signal?: AbortSignal) {
    return this.client.get<ApiResponse<readonly AssignedAppointment[]>>(
      '/api/v1/me/assigned-appointments',
      { query: { ...params }, signal },
    );
  }

  /** UC-SPA-26: the visits the caller completed, newest first. */
  listHistory(params: CareHistoryParams = {}, signal?: AbortSignal) {
    return this.client.get<ApiResponse<PagedResponse<CareHistoryItem>>>('/api/v1/me/care-history', {
      query: { ...params },
      signal,
    });
  }

  getAppointment(id: string, signal?: AbortSignal) {
    return this.client.get<ApiResponse<AppointmentDetail>>(appointmentPath(id), { signal });
  }

  getSkinProfile(appointmentId: string, signal?: AbortSignal) {
    return this.client.get<ApiResponse<SkinProfile>>(
      appointmentPath(appointmentId, 'skin-profile'),
      { signal },
    );
  }

  createSkinProfile(appointmentId: string, body: SaveSkinProfileRequest) {
    return this.client.post<SaveSkinProfileRequest, ApiResponse<SkinProfile>>(
      appointmentPath(appointmentId, 'skin-profile'),
      body,
    );
  }

  updateSkinProfile(skinProfileId: string, body: SaveSkinProfileRequest) {
    return this.client.put<SaveSkinProfileRequest, ApiResponse<SkinProfile>>(
      `/api/v1/skin-profiles/${encodeURIComponent(skinProfileId)}`,
      body,
    );
  }

  listAllergies(customerId: string, signal?: AbortSignal) {
    return this.client.get<ApiResponse<readonly CustomerAllergy[]>>(allergiesPath(customerId), {
      signal,
    });
  }

  createAllergy(customerId: string, body: SaveAllergyRequest) {
    return this.client.post<SaveAllergyRequest, ApiResponse<CustomerAllergy>>(
      allergiesPath(customerId),
      body,
    );
  }

  updateAllergy(customerId: string, allergyId: string, body: SaveAllergyRequest) {
    return this.client.put<SaveAllergyRequest, ApiResponse<CustomerAllergy>>(
      allergiesPath(customerId, allergyId),
      body,
    );
  }

  /** 204 No Content. */
  deleteAllergy(customerId: string, allergyId: string) {
    return this.client.delete<void>(allergiesPath(customerId, allergyId));
  }

  complete(id: string, result: string | null) {
    return this.client.post<{ result: string | null }, ApiResponse<CompleteAppointmentResult>>(
      appointmentPath(id, 'complete'),
      { result },
    );
  }
}

export const careQueryKeys = {
  all: ['care'] as const,
  assignedAll: ['care', 'assigned'] as const,
  assigned: (params: AssignedAppointmentListParams) => ['care', 'assigned', params] as const,
  historyAll: ['care', 'history'] as const,
  history: (params: CareHistoryParams) => ['care', 'history', params] as const,
  appointment: (id: string) => ['care', 'appointment', id] as const,
  skinProfile: (appointmentId: string) => ['care', 'skin-profile', appointmentId] as const,
  allergies: (customerId: string) => ['care', 'allergies', customerId] as const,
};
