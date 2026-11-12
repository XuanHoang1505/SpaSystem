import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ordersQueryKeys } from '@spa/api-client';
import type { OrderSearchParams } from '@spa/shared-types';
import { callOrderManagement } from '@/lib/api/orders';
import { ordersRetry } from './ordersRetry';

/** The owner's order search (UC-SPA-13); the previous page stays on screen while the next loads. */
export function useManagedOrders(params: OrderSearchParams) {
  return useQuery({
    queryKey: ordersQueryKeys.managedList(params),
    queryFn: ({ signal }) => callOrderManagement((api) => api.listOrders(params, signal)),
    placeholderData: keepPreviousData,
    retry: ordersRetry,
  });
}
