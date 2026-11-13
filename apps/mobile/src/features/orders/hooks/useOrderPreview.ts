import { useQuery } from '@tanstack/react-query';
import type { OrderPreview, OrderRequest } from '@spa/shared-types';
import { callOrders, ordersQueryKeys } from '@/lib/api/orders';
import { ordersRetry } from './ordersRetry';

export function useOrderPreview(request: OrderRequest | undefined, enabled = true) {
  return useQuery<OrderPreview>({
    queryKey: ordersQueryKeys.preview(request ?? { source: 'cart' }),
    queryFn: () => {
      if (!request) throw new Error('Order request is required');
      return callOrders((api) => api.previewOrder(request));
    },
    enabled: Boolean(request && enabled),
    retry: ordersRetry,
    staleTime: 10_000,
  });
}
