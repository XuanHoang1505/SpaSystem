import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { catalogQueryKeys } from '@spa/api-client';
import type { ServiceSearchParams } from '@spa/shared-types';
import { callCatalog } from '@/lib/api/catalog';
import { catalogRetry } from './catalogRetry';

export function useServiceSearch(params: ServiceSearchParams) {
  return useQuery({
    queryKey: catalogQueryKeys.services(params),
    queryFn: ({ signal }) => callCatalog((api) => api.searchServices(params, signal)),
    retry: catalogRetry,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
