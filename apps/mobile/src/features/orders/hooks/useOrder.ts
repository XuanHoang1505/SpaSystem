import { useQuery } from '@tanstack/react-query';
import type { OrderDetail } from '@spa/shared-types';
import { callOrders, ordersQueryKeys } from '@/lib/api/orders';
import { ordersRetry } from './ordersRetry';

export function useOrder(id: string | undefined, enabled = true) {
  return useQuery<OrderDetail>({
    queryKey: ordersQueryKeys.order(id ?? ''),
    queryFn: () => {
      if (!id) throw new Error('Order ID is required');
      return callOrders((api) => api.getOrder(id));
    },
    enabled: Boolean(id && enabled),
    retry: ordersRetry,
  });
}
