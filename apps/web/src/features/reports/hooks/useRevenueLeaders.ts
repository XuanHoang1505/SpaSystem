import { useQuery } from '@tanstack/react-query';
import type { RevenueLeadersDto, RevenueLeadersQuery } from '@spa/shared-types';
import { callReports } from '@/lib/api/reports';
import { reportsQueryKeys } from '../reportQueryKeys';

/** Top customers by revenue and top staff by completed visits, aggregated by the API over the whole range. */
export function useRevenueLeaders(query?: RevenueLeadersQuery) {
  return useQuery<RevenueLeadersDto>({
    queryKey: reportsQueryKeys.leaders(query),
    queryFn: ({ signal }) => callReports((api) => api.getLeaders(query, signal)),
  });
}
