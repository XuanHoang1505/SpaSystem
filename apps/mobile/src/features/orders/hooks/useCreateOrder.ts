import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { OrderDetail, OrderRequest } from '@spa/shared-types';
import { callOrders, ordersQueryKeys } from '@/lib/api/orders';

export interface CreateOrderVariables {
  request: OrderRequest;
  idempotencyKey: string;
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation<OrderDetail, Error, CreateOrderVariables>({
    mutationFn: ({ request, idempotencyKey }) =>
      callOrders((api) => api.createOrder(request, idempotencyKey)),
    onSuccess: (order) => {
      queryClient.setQueryData(ordersQueryKeys.order(order.id), order);
      void queryClient.invalidateQueries({ queryKey: ordersQueryKeys.cart });
    },
  });
}
