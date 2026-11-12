import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { staffQueryKeys } from '@spa/api-client';
import type { StaffFilterParams } from '@spa/shared-types';
import { callStaff } from '@/lib/api/staff';

export function useStaffList(params?: StaffFilterParams) {
  return useQuery({
    queryKey: staffQueryKeys.list(params),
    queryFn: ({ signal }) => callStaff((api) => api.list(params, signal)),
    placeholderData: keepPreviousData,
  });
}
