import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersQueryKeys } from '@spa/api-client';
import { callOrders } from '@/lib/api/orders';

/** A new payment attempt for an order (a retry is a new attempt); returns the signed VNPay URL. */
export function useStartPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => callOrders((api) => api.createPayment(orderId, 'web')),
    onSettled: (_data, _error, orderId) =>
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.order(orderId) }),
  });
}
