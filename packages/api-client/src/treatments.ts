import type {
  ApiResponse,
  MyTreatmentListItem,
  MyTreatmentPlan,
  MyTreatmentSession,
  TreatmentPlanStatus,
} from '@spa/shared-types';
import type { ApiClient } from './index';

const base = '/api/v1/me/treatments';

export const treatmentErrorCodes = {
  treatmentPlanNotFound: 'treatment_plan_not_found',
  treatmentSessionNotFound: 'treatment_session_not_found',
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

export const treatmentsQueryKeys = {
  all: ['treatments'] as const,
  list: (status?: string) => ['treatments', 'me', 'list', { status }] as const,
  detail: (id: string) => ['treatments', 'detail', id] as const,
  session: (id: string, sessionId: string) => ['treatments', 'session', id, sessionId] as const,
};
