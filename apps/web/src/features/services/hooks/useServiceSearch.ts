import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { catalogQueryKeys } from '@spa/api-client';
import type { ServiceSearchParams } from '@spa/shared-types';
import { callCatalog } from '@/lib/api/catalog';
import { catalogRetry } from './catalogRetry';
import { useCatalogQueryEnabled } from './useCatalogQueryEnabled';

export function useServiceSearch(params: ServiceSearchParams) {
  const enabled = useCatalogQueryEnabled();
  return useQuery({
    queryKey: catalogQueryKeys.services(params),
    queryFn: ({ signal }) => callCatalog((api) => api.searchServices(params, signal)),
    retry: catalogRetry,
    enabled,
    placeholderData: keepPreviousData,
  });
}
