import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { catalogQueryKeys } from '@spa/api-client';
import type { PackageSearchParams } from '@spa/shared-types';
import { callCatalog } from '@/lib/api/catalog';
import { catalogRetry } from '@/features/services/hooks/catalogRetry';

export function usePackageSearch(params: PackageSearchParams) {
  return useQuery({
    queryKey: catalogQueryKeys.packages(params),
    queryFn: ({ signal }) => callCatalog((api) => api.searchPackages(params, signal)),
    retry: catalogRetry,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
