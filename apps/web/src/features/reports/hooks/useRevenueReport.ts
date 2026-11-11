import { useQuery } from '@tanstack/react-query';
import type { RevenueReportDto, RevenueReportQuery } from '@spa/shared-types';
import { callReports } from '@/lib/api/reports';
import { reportsQueryKeys } from '../reportQueryKeys';

export function useRevenueReport(query?: RevenueReportQuery) {
  return useQuery<RevenueReportDto>({
    queryKey: reportsQueryKeys.revenue(query),
    queryFn: ({ signal }) => callReports((api) => api.getRevenue(query, signal)),
  });
}
