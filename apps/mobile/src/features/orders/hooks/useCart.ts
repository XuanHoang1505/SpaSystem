import { useQuery } from '@tanstack/react-query';
import type { Cart } from '@spa/shared-types';
import { callOrders, ordersQueryKeys } from '@/lib/api/orders';
import { useAuthStore } from '@/stores/authStore';
import { ordersRetry } from './ordersRetry';

export function useCart() {
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === 'authenticated';

  return useQuery<Cart>({
    queryKey: ordersQueryKeys.cart,
    queryFn: () => callOrders((api) => api.getCart()),
    enabled: isAuthenticated,
    retry: ordersRetry,
    staleTime: 30_000,
  });
}
