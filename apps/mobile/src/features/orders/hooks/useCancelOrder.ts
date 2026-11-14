import { useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsQueryKeys, ordersQueryKeys, purchasesQueryKeys } from '@spa/api-client';
import { callOrders } from '@/lib/api/orders';

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      callOrders((api) => api.cancelOrder(orderId, reason)),
    onSuccess: (order) => {
      queryClient.setQueryData(ordersQueryKeys.order(order.id), order);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: appointmentsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: purchasesQueryKeys.all });
    },
  });
}
