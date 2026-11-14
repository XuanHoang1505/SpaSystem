import { useQuery } from '@tanstack/react-query';
import { callPurchases, purchasesQueryKeys } from '@/lib/api/appointments';
import { bookingsRetry } from '@/features/bookings/hooks/bookingsRetry';

export function useMyPurchases(enabled = true) {
  return useQuery({
    queryKey: purchasesQueryKeys.list,
    queryFn: ({ signal }) => callPurchases((api) => api.list(signal)),
    enabled,
    retry: bookingsRetry,
  });
}
