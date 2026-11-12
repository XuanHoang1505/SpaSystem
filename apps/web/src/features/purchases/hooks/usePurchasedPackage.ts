import { useQuery } from '@tanstack/react-query';
import { purchasesQueryKeys } from '@spa/api-client';
import { ordersRetry } from '@/features/orders';
import { callPurchases } from '@/lib/api/purchases';

/** One bought package with its order and treatment plan id. */
export function usePurchasedPackage(id: string, enabled = true) {
  return useQuery({
    queryKey: purchasesQueryKeys.package(id),
    queryFn: ({ signal }) => callPurchases((api) => api.getPackage(id, signal)),
    enabled,
    retry: ordersRetry,
  });
}
