import { useQuery } from '@tanstack/react-query';
import { serviceHistoryQueryKeys } from '@spa/api-client';
import { ordersRetry } from '@/features/orders';
import { callServiceHistory } from '@/lib/api/serviceHistory';

/** Detail of one past visit with its care result (UC-SPA-20). */
export function useServiceHistoryDetail(appointmentId: string, enabled = true) {
  return useQuery({
    queryKey: serviceHistoryQueryKeys.detail(appointmentId),
    queryFn: ({ signal }) => callServiceHistory((api) => api.get(appointmentId, signal)),
    enabled: enabled && Boolean(appointmentId),
    retry: ordersRetry,
  });
}
