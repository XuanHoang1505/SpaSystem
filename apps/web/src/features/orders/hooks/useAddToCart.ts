import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersQueryKeys } from '@spa/api-client';
import type { AddCartItemRequest } from '@spa/shared-types';
import { callOrders } from '@/lib/api/orders';

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AddCartItemRequest) => callOrders((api) => api.addCartItem(body)),
    onSuccess: (cart) => queryClient.setQueryData(ordersQueryKeys.cart, cart),
  });
}
