import { useQuery } from '@tanstack/react-query';
import type { RevenueByProductDto, RevenueByProductQuery } from '@spa/shared-types';
import { callReports } from '@/lib/api/reports';
import { reportsQueryKeys } from '../reportQueryKeys';

export function useRevenueByProduct(query?: RevenueByProductQuery) {
  return useQuery<RevenueByProductDto>({
    queryKey: reportsQueryKeys.byProduct(query),
    queryFn: ({ signal }) => callReports((api) => api.getByProduct(query, signal)),
  });
}
