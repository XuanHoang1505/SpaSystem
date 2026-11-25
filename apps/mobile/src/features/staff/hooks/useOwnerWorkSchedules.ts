import { useQuery } from '@tanstack/react-query';
import { callWorkSchedules, workSchedulesQueryKeys } from '@/lib/api/owner';

/** Every staff member's shifts of one week for the owner, read only (UC-SPA-23). */
export function useOwnerWorkSchedules(fromDate: string, toDate: string, staffMemberId?: string) {
  return useQuery({
    queryKey: workSchedulesQueryKeys.weekly(fromDate, toDate, staffMemberId),
    queryFn: ({ signal }) =>
      callWorkSchedules((api) => api.list({ fromDate, toDate, staffMemberId }, signal)),
    retry: 1,
  });
}
