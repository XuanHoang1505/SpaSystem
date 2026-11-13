import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PaymentAttempt, PaymentClient } from '@spa/shared-types';
import { callOrders, ordersQueryKeys } from '@/lib/api/orders';

export interface CreatePaymentVariables {
  orderId: string;
  client?: PaymentClient;
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation<PaymentAttempt, Error, CreatePaymentVariables>({
    mutationFn: ({ orderId, client = 'mobile' }) =>
      callOrders((api) => api.createPayment(orderId, client)),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.order(variables.orderId),
      });
    },
  });
}
