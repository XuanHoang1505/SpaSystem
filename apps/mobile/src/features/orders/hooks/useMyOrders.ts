import { useQuery } from '@tanstack/react-query';
import type { OrderListParams } from '@spa/shared-types';
import { callOrders, ordersQueryKeys } from '@/lib/api/orders';
import { ordersRetry } from './ordersRetry';

export function useMyOrders(params: OrderListParams = {}, enabled = true) {
  return useQuery({
    queryKey: ordersQueryKeys.list(params),
    queryFn: ({ signal }) => callOrders((api) => api.listOrders(params, signal)),
    enabled,
    retry: ordersRetry,
  });
}
