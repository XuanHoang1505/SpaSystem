import { useQuery } from '@tanstack/react-query';
import type { StaffFilterParams } from '@spa/shared-types';
import { callStaff, staffQueryKeys } from '@/lib/api/owner';

/** The owner's staff list (UC-SPA-22); a spa has few staff, so one page of 100 is the whole list. */
export function useOwnerStaff(status: StaffFilterParams['status']) {
  const params: StaffFilterParams = { status, pageNumber: 1, pageSize: 100 };
  return useQuery({
    queryKey: staffQueryKeys.list(params),
    queryFn: ({ signal }) => callStaff((api) => api.list(params, signal)),
    retry: 1,
  });
}
