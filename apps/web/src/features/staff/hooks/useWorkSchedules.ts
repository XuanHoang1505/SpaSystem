import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { workSchedulesQueryKeys } from '@spa/api-client';
import type { WorkScheduleQueryParams } from '@spa/shared-types';
import { callWorkSchedules } from '@/lib/api/workSchedules';

export function useWorkSchedules(params?: WorkScheduleQueryParams) {
  return useQuery({
    queryKey: workSchedulesQueryKeys.list(params),
    queryFn: ({ signal }) => callWorkSchedules((api) => api.list(params, signal)),
    placeholderData: keepPreviousData,
  });
}
