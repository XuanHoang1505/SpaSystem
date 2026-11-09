import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersQueryKeys } from '@spa/api-client';
import { callOrders } from '@/lib/api/orders';
import { orderErrorCode } from '../errors';

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => callOrders((api) => api.removeCartItem(itemId)),
    onSuccess: (cart) => queryClient.setQueryData(ordersQueryKeys.cart, cart),
    onError: (error) => {
      // The line is already gone (another tab): reload the cart.
      if (orderErrorCode(error) === 'cart_item_not_found')
        void queryClient.invalidateQueries({ queryKey: ordersQueryKeys.cart });
    },
  });
}
