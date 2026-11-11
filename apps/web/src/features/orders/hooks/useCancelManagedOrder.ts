import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersQueryKeys } from '@spa/api-client';
import { callOrderManagement } from '@/lib/api/orders';

/**
 * The owner cancels an unpaid order (UC-SPA-13). Success stores the returned detail; the owner lists are
 * always reloaded, and a refusal also reloads the detail (the order may have changed meanwhile).
 */
export function useCancelManagedOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      callOrderManagement((api) => api.cancelOrder(id, reason)),
    onSuccess: (order) => queryClient.setQueryData(ordersQueryKeys.managedOrder(order.id), order),
    onSettled: async (_order, error, { id }) => {
      await queryClient.invalidateQueries({ queryKey: ordersQueryKeys.managedLists });
      if (error)
        await queryClient.invalidateQueries({ queryKey: ordersQueryKeys.managedOrder(id) });
    },
  });
}
