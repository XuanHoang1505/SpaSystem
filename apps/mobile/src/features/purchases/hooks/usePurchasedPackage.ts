import { useQuery } from '@tanstack/react-query';
import { callPurchases, purchasesQueryKeys } from '@/lib/api/appointments';
import { bookingsRetry } from '@/features/bookings/hooks/bookingsRetry';

export function usePurchasedPackage(packageId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: purchasesQueryKeys.package(packageId ?? ''),
    queryFn: ({ signal }) => callPurchases((api) => api.getPackage(packageId!, signal)),
    enabled: Boolean(packageId) && enabled,
    retry: bookingsRetry,
  });
}
