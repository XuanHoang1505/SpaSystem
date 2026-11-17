import { useQuery } from '@tanstack/react-query';
import type { RevenueByProductDto, RevenueByProductQuery } from '@spa/shared-types';
import { callReports, reportsQueryKeys } from '@/lib/api/reports';
import { useAuthStore } from '@/stores/authStore';

export function useRevenueByProduct(query?: RevenueByProductQuery, enabled = true) {
  const status = useAuthStore((s) => s.status);
  const isAuthenticated = status === 'authenticated';

  return useQuery<RevenueByProductDto>({
    queryKey: reportsQueryKeys.byProduct(query),
    queryFn: ({ signal }) => callReports((api) => api.getByProduct(query, signal)),
    enabled: isAuthenticated && enabled,
    staleTime: 60_000,
  });
}
