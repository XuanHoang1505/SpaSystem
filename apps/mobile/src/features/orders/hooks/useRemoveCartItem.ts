import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Cart } from '@spa/shared-types';
import { callOrders, ordersQueryKeys } from '@/lib/api/orders';

export function useRemoveCartItem() {
  const queryClient = useQueryClient();

  return useMutation<Cart, Error, string>({
    mutationFn: (itemId) => callOrders((api) => api.removeCartItem(itemId)),
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(ordersQueryKeys.cart, updatedCart);
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: ordersQueryKeys.cart });
    },
  });
}
