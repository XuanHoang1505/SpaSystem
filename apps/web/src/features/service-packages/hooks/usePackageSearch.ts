import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { catalogQueryKeys } from '@spa/api-client';
import type { PackageSearchParams } from '@spa/shared-types';
import { catalogRetry, useCatalogQueryEnabled } from '@/features/services';
import { callCatalog } from '@/lib/api/catalog';

export function usePackageSearch(params: PackageSearchParams) {
  const enabled = useCatalogQueryEnabled();
  return useQuery({
    queryKey: catalogQueryKeys.packages(params),
    queryFn: ({ signal }) => callCatalog((api) => api.searchPackages(params, signal)),
    retry: catalogRetry,
    enabled,
    placeholderData: keepPreviousData,
  });
}
