import { useQuery } from '@tanstack/react-query';
import { staffQueryKeys } from '@spa/api-client';
import { ordersRetry } from '@/features/orders';
import { callStaff } from '@/lib/api/appointments';

const LIMIT = 100;

/** Working staff (`status=working`), optionally only those skilled in one service (assign-staff dialog). */
export function useWorkingStaff(spaServiceId?: string) {
  return useQuery({
    queryKey: spaServiceId
      ? [...staffQueryKeys.publicByService(spaServiceId), 'all']
      : staffQueryKeys.working(),
    queryFn: ({ signal }) =>
      callStaff((api) => api.listPublic({ spaServiceId, pageSize: LIMIT }, signal)),
    staleTime: 60_000,
    retry: ordersRetry,
  });
}
