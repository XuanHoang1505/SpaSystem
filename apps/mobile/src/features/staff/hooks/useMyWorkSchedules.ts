import { useQuery } from '@tanstack/react-query';
import type { MyWorkSchedule, MyWorkScheduleParams } from '@spa/shared-types';
import { callMyWorkSchedules, myWorkSchedulesQueryKeys } from '@/lib/api/workSchedules';

export function useMyWorkSchedules(params: MyWorkScheduleParams) {
  return useQuery<readonly MyWorkSchedule[]>({
    queryKey: myWorkSchedulesQueryKeys.list(params),
    queryFn: ({ signal }) => callMyWorkSchedules((api) => api.list(params, signal)),
    staleTime: 60_000,
  });
}
