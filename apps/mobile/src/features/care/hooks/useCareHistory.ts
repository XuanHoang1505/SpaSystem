import { useInfiniteQuery } from '@tanstack/react-query';
import type { CareHistoryItem, CareHistoryParams, PagedResponse } from '@spa/shared-types';
import { callCare, careQueryKeys } from '@/lib/api/care';

export interface UseCareHistoryOptions {
  search?: string;
  fromDate?: string;
  toDate?: string;
  customerId?: string;
  pageSize?: number;
}

export function useCareHistory(options: UseCareHistoryOptions = {}) {
  const { search, fromDate, toDate, customerId, pageSize = 10 } = options;

  return useInfiniteQuery<PagedResponse<CareHistoryItem>>({
    queryKey: careQueryKeys.history({ search, fromDate, toDate, customerId, pageSize }),
    queryFn: ({ pageParam, signal }) => {
      const page = typeof pageParam === 'number' ? pageParam : 1;
      const params: CareHistoryParams = {
        search: search?.trim() ? search.trim() : undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        customerId: customerId || undefined,
        pageNumber: page,
        pageSize,
      };
      return callCare((api) => api.listHistory(params, signal));
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pageNumber < lastPage.totalPages) {
        return lastPage.pageNumber + 1;
      }
      return undefined;
    },
    staleTime: 60_000,
  });
}
