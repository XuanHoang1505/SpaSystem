import { useQuery } from '@tanstack/react-query';
import type { MyWorkScheduleDetail } from '@spa/shared-types';
import { callMyWorkSchedules, myWorkSchedulesQueryKeys } from '@/lib/api/workSchedules';

export function useMyWorkScheduleDetail(shiftId?: string | null) {
  return useQuery<MyWorkScheduleDetail>({
    queryKey: shiftId
      ? myWorkSchedulesQueryKeys.detail(shiftId)
      : ['myWorkSchedules', 'detail', 'none'],
    queryFn: ({ signal }) => {
      if (!shiftId) throw new Error('shiftId is required');
      return callMyWorkSchedules((api) => api.get(shiftId, signal));
    },
    enabled: Boolean(shiftId),
    staleTime: 60_000,
  });
}
