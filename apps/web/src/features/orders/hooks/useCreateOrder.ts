import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersQueryKeys } from '@spa/api-client';
import type { OrderRequest } from '@spa/shared-types';
import { callOrders } from '@/lib/api/orders';

/** Creates the order; the same `idempotencyKey` returns the earlier order instead of a second one (BR-ORD-08). */
export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ request, idempotencyKey }: { request: OrderRequest; idempotencyKey: string }) =>
      callOrders((api) => api.createOrder(request, idempotencyKey)),
    onSuccess: (order) => {
      queryClient.setQueryData(ordersQueryKeys.order(order.id), order);
      void queryClient.invalidateQueries({ queryKey: ordersQueryKeys.cart });
    },
  });
}
