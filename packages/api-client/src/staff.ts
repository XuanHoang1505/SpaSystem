import type { ApiResponse, PagedResponse, PublicStaffMember } from '@spa/shared-types';
import type { ApiClient } from './index';

/**
 * Public list of working staff (no contact details). `status=working` keeps resigned staff out even when an owner's
 * Bearer turns the same endpoint into the owner view (guests ignore it).
 */
export class StaffApi {
  constructor(private readonly client: ApiClient) {}

  listPublic(params: { spaServiceId?: string; pageSize?: number }, signal?: AbortSignal) {
    return this.client.get<ApiResponse<PagedResponse<PublicStaffMember>>>('/api/v1/staff', {
      query: { ...params, status: 'working', pageNumber: 1 },
      signal,
    });
  }
}

export const staffQueryKeys = {
  all: ['staff'] as const,
  publicByService: (spaServiceId: string) => ['staff', 'public', spaServiceId] as const,
  /** Every working staff member, not filtered by service (owner filters, day calendar). */
  working: () => ['staff', 'working'] as const,
};
