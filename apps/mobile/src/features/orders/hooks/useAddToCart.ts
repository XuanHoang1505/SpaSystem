import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AddCartItemRequest, Cart } from '@spa/shared-types';
import { callOrders, ordersQueryKeys } from '@/lib/api/orders';

export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation<Cart, Error, AddCartItemRequest>({
    mutationFn: (body) => callOrders((api) => api.addCartItem(body)),
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(ordersQueryKeys.cart, updatedCart);
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: ordersQueryKeys.cart });
    },
  });
}
