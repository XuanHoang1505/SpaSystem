import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersQueryKeys } from '@spa/api-client';
import { callOrders } from '@/lib/api/orders';

/** Cancels an unpaid order (UC-SPA-12); every order list is reloaded, success or not (the order may have changed). */
export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      callOrders((api) => api.cancelOrder(id, reason)),
    onSuccess: (order) => queryClient.setQueryData(ordersQueryKeys.order(order.id), order),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['orders', 'list'] }),
  });
}
