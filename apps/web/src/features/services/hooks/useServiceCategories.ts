import { useQuery } from '@tanstack/react-query';
import { catalogQueryKeys } from '@spa/api-client';
import { callCatalog } from '@/lib/api/catalog';
import { catalogRetry } from './catalogRetry';
import { useCatalogQueryEnabled } from './useCatalogQueryEnabled';

export function useServiceCategories() {
  const enabled = useCatalogQueryEnabled();
  return useQuery({
    queryKey: catalogQueryKeys.categories,
    queryFn: ({ signal }) => callCatalog((api) => api.listServiceCategories(signal)),
    retry: catalogRetry,
    enabled,
  });
}
