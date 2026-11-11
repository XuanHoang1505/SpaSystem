import { useQuery } from '@tanstack/react-query';
import { myWorkSchedulesQueryKeys } from '@spa/api-client';
import type { MyWorkScheduleParams } from '@spa/shared-types';
import { ordersRetry } from '@/features/orders';
import { callMyWorkSchedules } from '@/lib/api/workSchedules';

/** SCR-W25: the signed-in staff member's shifts in the week or month grid range. */
export function useMyWorkSchedules(params: MyWorkScheduleParams) {
  return useQuery({
    queryKey: myWorkSchedulesQueryKeys.list(params),
    queryFn: ({ signal }) => callMyWorkSchedules((api) => api.list(params, signal)),
    retry: ordersRetry,
  });
}

/** One shift with the appointments inside it; `null` sends nothing. */
export function useMyWorkSchedule(id: string | null) {
  return useQuery({
    queryKey: myWorkSchedulesQueryKeys.detail(id ?? ''),
    queryFn: ({ signal }) => callMyWorkSchedules((api) => api.get(id ?? '', signal)),
    enabled: id !== null,
    retry: ordersRetry,
  });
}
