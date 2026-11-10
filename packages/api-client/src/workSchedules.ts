import type {
  ApiResponse,
  ChangeWorkScheduleStatusRequest,
  CreateWorkScheduleBatchRequest,
  CreateWorkScheduleRequest,
  UpdateWorkScheduleRequest,
  WorkScheduleBatchResult,
  WorkScheduleItem,
  WorkScheduleQueryParams,
} from '@spa/shared-types';
import type { ApiClient } from './index';

export class WorkSchedulesApi {
  constructor(private readonly client: ApiClient) {}

  /** List work shifts within date range (UC-SPA-23). */
  list(params?: WorkScheduleQueryParams, signal?: AbortSignal) {
    return this.client.get<ApiResponse<readonly WorkScheduleItem[]>>('/api/v1/work-schedules', {
      query: { ...params },
      signal,
    });
  }

  /** Create a single shift (UC-SPA-23). */
  create(body: CreateWorkScheduleRequest, signal?: AbortSignal) {
    return this.client.post<CreateWorkScheduleRequest, ApiResponse<WorkScheduleItem>>(
      '/api/v1/work-schedules',
      body,
      { signal },
    );
  }

  /** Create shifts in batch (UC-SPA-23). */
  createBatch(body: CreateWorkScheduleBatchRequest, signal?: AbortSignal) {
    return this.client.post<CreateWorkScheduleBatchRequest, ApiResponse<WorkScheduleBatchResult>>(
      '/api/v1/work-schedules/batch',
      body,
      { signal },
    );
  }

  /** Update an existing shift (UC-SPA-23). */
  update(id: string, body: UpdateWorkScheduleRequest, signal?: AbortSignal) {
    return this.client.put<UpdateWorkScheduleRequest, ApiResponse<WorkScheduleItem>>(
      `/api/v1/work-schedules/${id}`,
      body,
      { signal },
    );
  }

  /** Change shift status (cancel shift) (UC-SPA-23). */
  changeStatus(id: string, body: ChangeWorkScheduleStatusRequest, signal?: AbortSignal) {
    return this.client.patch<ChangeWorkScheduleStatusRequest, void>(
      `/api/v1/work-schedules/${id}/status`,
      body,
      { signal },
    );
  }
}

export const workScheduleErrorCodes = {
  WORK_SCHEDULE_NOT_FOUND: 'work_schedule_not_found',
  SHIFT_CONFLICT: 'shift_conflict',
  SHIFT_HAS_APPOINTMENTS: 'shift_has_appointments',
  SHIFT_DATE_OUT_OF_RANGE: 'shift_date_out_of_range',
  SHIFT_IN_PAST: 'shift_in_past',
  SHIFT_BEFORE_HIRE_DATE: 'shift_before_hire_date',
  STAFF_RESIGNED: 'staff_resigned',
  SHIFT_CANCELLED: 'shift_cancelled',
} as const;

export const workSchedulesQueryKeys = {
  all: ['workSchedules'] as const,
  list: (params?: WorkScheduleQueryParams) => ['workSchedules', 'list', params] as const,
  weekly: (fromDate: string, toDate: string, staffMemberId?: string) =>
    ['workSchedules', 'weekly', { fromDate, toDate, staffMemberId }] as const,
};
