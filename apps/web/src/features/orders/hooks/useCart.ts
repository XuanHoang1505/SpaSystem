import { useQuery } from '@tanstack/react-query';
import { ordersQueryKeys } from '@spa/api-client';
import { callOrders } from '@/lib/api/orders';
import { useAuthStore } from '@/stores/authStore';
import { ordersRetry } from './ordersRetry';

/** The signed-in customer's cart; never requested for guests, staff or owners. */
export function useCart() {
  const isCustomer = useAuthStore(
    (state) => state.status === 'authenticated' && state.user?.role === 'customer',
  );
  return useQuery({
    queryKey: ordersQueryKeys.cart,
    queryFn: ({ signal }) => callOrders((api) => api.getCart(signal)),
    retry: ordersRetry,
    enabled: isCustomer,
  });
}
