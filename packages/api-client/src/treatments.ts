import type {
  ApiResponse,
  AssignTreatmentStaffRequest,
  MyTreatmentListItem,
  MyTreatmentPlan,
  MyTreatmentSession,
  PagedResponse,
  TreatmentPlanDto,
  TreatmentPlanListItemDto,
  TreatmentPlanStatus,
  TreatmentReasonRequest,
  TreatmentSearchParams,
  TreatmentSessionDto,
  UpdateTreatmentPlanRequest,
  UpdateTreatmentSessionRequest,
} from '@spa/shared-types';
import type { ApiClient } from './index';

const base = '/api/v1/me/treatments';
const ownerBase = '/api/v1/treatments';

function ownerPath(id: string, action?: string): string {
  const path = `${ownerBase}/${encodeURIComponent(id)}`;
  return action ? `${path}/${action}` : path;
}

export const treatmentErrorCodes = {
  treatmentPlanNotFound: 'treatment_plan_not_found',
  treatmentSessionNotFound: 'treatment_session_not_found',
  treatmentNotInCharge: 'treatment_not_in_charge',
  treatmentStatusInvalid: 'treatment_status_invalid',
  treatmentHasBookedSessions: 'treatment_has_booked_sessions',
  treatmentSessionsRemaining: 'treatment_sessions_remaining',
  treatmentSessionCompleted: 'treatment_session_completed',
  staffNotFound: 'staff_not_found',
  staffResigned: 'staff_resigned',
  validationError: 'validation_error',
} as const;

/** UC-SPA-19 (read only): a customer's treatment plans, detail and its sessions. */
export class TreatmentsApi {
  constructor(private readonly client: ApiClient) {}

  list(status?: TreatmentPlanStatus, signal?: AbortSignal) {
    return this.client.get<ApiResponse<readonly MyTreatmentListItem[]>>(base, {
      query: status ? { status } : undefined,
      signal,
    });
  }

  get(id: string, signal?: AbortSignal) {
    return this.client.get<ApiResponse<MyTreatmentPlan>>(`${base}/${encodeURIComponent(id)}`, {
      signal,
    });
  }

  getSession(id: string, sessionId: string, signal?: AbortSignal) {
    return this.client.get<ApiResponse<MyTreatmentSession>>(
      `${base}/${encodeURIComponent(id)}/sessions/${encodeURIComponent(sessionId)}`,
      { signal },
    );
  }
}

/** UC-SPA-21: treatment plan management for owners and in-charge staff. */
export class OwnerTreatmentsApi {
  constructor(private readonly client: ApiClient) {}

  search(params?: TreatmentSearchParams, signal?: AbortSignal) {
    return this.client.get<ApiResponse<PagedResponse<TreatmentPlanListItemDto>>>(ownerBase, {
      query: params ? { ...params } : undefined,
      signal,
    });
  }

  get(id: string, signal?: AbortSignal) {
    return this.client.get<ApiResponse<TreatmentPlanDto>>(ownerPath(id), { signal });
  }

  update(id: string, body: UpdateTreatmentPlanRequest, signal?: AbortSignal) {
    return this.client.put<UpdateTreatmentPlanRequest, ApiResponse<TreatmentPlanDto>>(
      ownerPath(id),
      body,
      { signal },
    );
  }

  updateSession(
    id: string,
    sessionId: string,
    body: UpdateTreatmentSessionRequest,
    signal?: AbortSignal,
  ) {
    return this.client.put<UpdateTreatmentSessionRequest, ApiResponse<TreatmentSessionDto>>(
      `${ownerPath(id)}/sessions/${encodeURIComponent(sessionId)}`,
      body,
      { signal },
    );
  }

  assignStaff(id: string, body: AssignTreatmentStaffRequest, signal?: AbortSignal) {
    return this.client.post<AssignTreatmentStaffRequest, ApiResponse<TreatmentPlanDto>>(
      ownerPath(id, 'assign-staff'),
      body,
      { signal },
    );
  }

  pause(id: string, body: TreatmentReasonRequest, signal?: AbortSignal) {
    return this.client.post<TreatmentReasonRequest, ApiResponse<TreatmentPlanDto>>(
      ownerPath(id, 'pause'),
      body,
      { signal },
    );
  }

  resume(id: string, signal?: AbortSignal) {
    return this.client.post<Record<string, never>, ApiResponse<TreatmentPlanDto>>(
      ownerPath(id, 'resume'),
      {},
      { signal },
    );
  }

  cancel(id: string, body: TreatmentReasonRequest, signal?: AbortSignal) {
    return this.client.post<TreatmentReasonRequest, ApiResponse<TreatmentPlanDto>>(
      ownerPath(id, 'cancel'),
      body,
      { signal },
    );
  }

  complete(id: string, signal?: AbortSignal) {
    return this.client.post<Record<string, never>, ApiResponse<TreatmentPlanDto>>(
      ownerPath(id, 'complete'),
      {},
      { signal },
    );
  }
}

export const treatmentsQueryKeys = {
  all: ['treatments'] as const,
  list: (status?: string) => ['treatments', 'me', 'list', { status }] as const,
  detail: (id: string) => ['treatments', 'detail', id] as const,
  session: (id: string, sessionId: string) => ['treatments', 'session', id, sessionId] as const,
};
