import { useQuery } from '@tanstack/react-query';
import type { RevenueReportDto, RevenueReportQuery } from '@spa/shared-types';
import { callReports, reportsQueryKeys } from '@/lib/api/reports';
import { useAuthStore } from '@/stores/authStore';

export function useRevenueReport(query?: RevenueReportQuery, enabled = true) {
  const status = useAuthStore((s) => s.status);
  const isAuthenticated = status === 'authenticated';

  return useQuery<RevenueReportDto>({
    queryKey: reportsQueryKeys.revenue(query),
    queryFn: ({ signal }) => callReports((api) => api.getRevenue(query, signal)),
    enabled: isAuthenticated && enabled,
    staleTime: 60_000,
  });
}
