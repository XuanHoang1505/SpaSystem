import { useQuery } from '@tanstack/react-query';
import { ordersQueryKeys } from '@spa/api-client';
import { callOrderManagement } from '@/lib/api/orders';
import { ordersRetry } from './ordersRetry';

/** One order as the owner sees it (customer, gateway references); read only while `id` is set. */
export function useManagedOrder(id: string | null) {
  return useQuery({
    queryKey: ordersQueryKeys.managedOrder(id ?? ''),
    queryFn: ({ signal }) => callOrderManagement((api) => api.getOrder(id ?? '', signal)),
    enabled: id !== null,
    retry: ordersRetry,
  });
}
