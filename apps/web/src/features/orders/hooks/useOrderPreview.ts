import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ordersQueryKeys } from '@spa/api-client';
import type { OrderRequest } from '@spa/shared-types';
import { callOrders } from '@/lib/api/orders';
import { ordersRetry } from './ordersRetry';

/** What the order would be now (prices, promotion); writes nothing, so it is always re-read. */
export function useOrderPreview(request: OrderRequest | null) {
  return useQuery({
    queryKey: ordersQueryKeys.preview(request ?? { source: 'cart' }),
    queryFn: ({ signal }) => {
      if (!request) throw new Error('No order request.');
      return callOrders((api) => api.previewOrder(request, signal));
    },
    enabled: request !== null,
    staleTime: 0,
    gcTime: 0,
    placeholderData: keepPreviousData,
    retry: ordersRetry,
  });
}
