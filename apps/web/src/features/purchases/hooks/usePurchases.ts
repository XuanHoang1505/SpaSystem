import { useQuery } from '@tanstack/react-query';
import { purchasesQueryKeys } from '@spa/api-client';
import { ordersRetry } from '@/features/orders';
import { callPurchases } from '@/lib/api/purchases';

/** Services and packages the signed-in customer has bought (statuses are computed by the API). */
export function usePurchases(enabled = true) {
  return useQuery({
    queryKey: purchasesQueryKeys.list,
    queryFn: ({ signal }) => callPurchases((api) => api.list(signal)),
    enabled,
    retry: ordersRetry,
  });
}
