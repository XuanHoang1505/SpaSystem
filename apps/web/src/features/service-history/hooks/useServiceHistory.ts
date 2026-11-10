import { useQuery } from '@tanstack/react-query';
import { serviceHistoryQueryKeys, type ServiceHistoryParams } from '@spa/api-client';
import { ordersRetry } from '@/features/orders';
import { callServiceHistory } from '@/lib/api/serviceHistory';

/** The customer's past visits / service history (UC-SPA-20). */
export function useServiceHistory(params: ServiceHistoryParams, enabled = true) {
  return useQuery({
    queryKey: serviceHistoryQueryKeys.list(params),
    queryFn: ({ signal }) => callServiceHistory((api) => api.list(params, signal)),
    enabled,
    retry: ordersRetry,
  });
}
