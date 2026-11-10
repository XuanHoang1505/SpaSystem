import type {
  ApiResponse,
  CreateStaffRequest,
  PagedResponse,
  PublicStaffMember,
  ResignStaffRequest,
  ResignationResult,
  StaffDetail,
  StaffFilterParams,
  StaffListItem,
  UpdateStaffRequest,
  UpdateStaffServicesRequest,
} from '@spa/shared-types';
import type { ApiClient } from './index';

export class StaffApi {
  constructor(private readonly client: ApiClient) {}

  /**
   * Public list of working staff (no contact details). `status=working` keeps resigned staff out even when an owner's
   * Bearer turns the same endpoint into the owner view (guests ignore it).
   */
  listPublic(params: { spaServiceId?: string; pageSize?: number }, signal?: AbortSignal) {
    return this.client.get<ApiResponse<PagedResponse<PublicStaffMember>>>('/api/v1/staff', {
      query: { ...params, status: 'working', pageNumber: 1 },
      signal,
    });
  }

  /** Owner full staff list with filters and paging (UC-SPA-22). */
  list(params?: StaffFilterParams, signal?: AbortSignal) {
    return this.client.get<ApiResponse<PagedResponse<StaffListItem>>>('/api/v1/staff', {
      query: { ...params },
      signal,
    });
  }

  /** Staff detail (UC-SPA-22). */
  get(id: string, signal?: AbortSignal) {
    return this.client.get<ApiResponse<StaffDetail>>(`/api/v1/staff/${id}`, { signal });
  }

  /** Create staff member and send temporary password (UC-SPA-22). */
  create(body: CreateStaffRequest, signal?: AbortSignal) {
    return this.client.post<CreateStaffRequest, ApiResponse<StaffDetail>>('/api/v1/staff', body, {
      signal,
    });
  }

  /** Update staff basic profile (UC-SPA-22). */
  update(id: string, body: UpdateStaffRequest, signal?: AbortSignal) {
    return this.client.put<UpdateStaffRequest, ApiResponse<StaffDetail>>(
      `/api/v1/staff/${id}`,
      body,
      { signal },
    );
  }

  /** Replace staff assigned services (UC-SPA-22). */
  updateServices(id: string, body: UpdateStaffServicesRequest, signal?: AbortSignal) {
    return this.client.put<UpdateStaffServicesRequest, void>(`/api/v1/staff/${id}/services`, body, {
      signal,
    });
  }

  /** Mark staff member as resigned (UC-SPA-22). */
  resign(id: string, body: ResignStaffRequest, signal?: AbortSignal) {
    return this.client.post<ResignStaffRequest, ApiResponse<ResignationResult>>(
      `/api/v1/staff/${id}/resign`,
      body,
      { signal },
    );
  }
}

export const staffErrorCodes = {
  STAFF_NOT_FOUND: 'staff_not_found',
  STAFF_SERVICE_NOT_FOUND: 'staff_service_not_found',
  STAFF_SERVICE_DISCONTINUED: 'staff_service_discontinued',
  STAFF_ALREADY_RESIGNED: 'staff_already_resigned',
  RESIGNATION_BEFORE_HIRE_DATE: 'resignation_before_hire_date',
  HIRE_DATE_AFTER_SHIFT: 'hire_date_after_shift',
  EMAIL_ALREADY_EXISTS: 'email_already_exists',
  PHONE_ALREADY_EXISTS: 'phone_already_exists',
} as const;

export const staffQueryKeys = {
  all: ['staff'] as const,
  list: (params?: StaffFilterParams) => ['staff', 'list', params] as const,
  detail: (id: string) => ['staff', 'detail', id] as const,
  publicByService: (spaServiceId: string) => ['staff', 'public', spaServiceId] as const,
  /** Every working staff member, not filtered by service (owner filters, day calendar). */
  working: () => ['staff', 'working'] as const,
};
