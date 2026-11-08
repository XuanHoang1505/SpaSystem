import { useQuery } from '@tanstack/react-query';
import { catalogQueryKeys } from '@spa/api-client';
import { catalogRetry, useCatalogQueryEnabled } from '@/features/services';
import { callCatalog } from '@/lib/api/catalog';

export function usePackage(id: string) {
  const enabled = useCatalogQueryEnabled();
  return useQuery({
    queryKey: catalogQueryKeys.package(id),
    queryFn: ({ signal }) => callCatalog((api) => api.getPackage(id, signal)),
    retry: catalogRetry,
    enabled,
  });
}
