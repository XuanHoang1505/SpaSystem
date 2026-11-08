import { useQuery } from '@tanstack/react-query';
import { catalogQueryKeys } from '@spa/api-client';
import { callCatalog } from '@/lib/api/catalog';
import { catalogRetry } from './catalogRetry';
import { useCatalogQueryEnabled } from './useCatalogQueryEnabled';

export function useService(id: string) {
  const enabled = useCatalogQueryEnabled();
  return useQuery({
    queryKey: catalogQueryKeys.service(id),
    queryFn: ({ signal }) => callCatalog((api) => api.getService(id, signal)),
    retry: catalogRetry,
    enabled,
  });
}
