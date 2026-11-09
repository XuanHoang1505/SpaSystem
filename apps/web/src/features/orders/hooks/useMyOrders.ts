import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ordersQueryKeys } from '@spa/api-client';
import type { OrderListParams } from '@spa/shared-types';
import { callOrders } from '@/lib/api/orders';
import { ordersRetry } from './ordersRetry';

/** The signed-in customer's orders, newest first; the previous page stays on screen while the next loads. */
export function useMyOrders(params: OrderListParams) {
  return useQuery({
    queryKey: ordersQueryKeys.list(params),
    queryFn: ({ signal }) => callOrders((api) => api.listOrders(params, signal)),
    placeholderData: keepPreviousData,
    retry: ordersRetry,
  });
}
