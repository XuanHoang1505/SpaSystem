import { useQuery } from '@tanstack/react-query';
import { catalogQueryKeys } from '@spa/api-client';
import { callCatalog } from '@/lib/api/catalog';
import { catalogRetry } from './catalogRetry';
import { useCatalogQueryEnabled } from './useCatalogQueryEnabled';

/** `wanted` = false skips the request (a caller that only sometimes needs the service). */
export function useService(id: string, wanted = true) {
  const sessionReady = useCatalogQueryEnabled();
  const enabled = sessionReady && wanted;
  return useQuery({
    queryKey: catalogQueryKeys.service(id),
    queryFn: ({ signal }) => callCatalog((api) => api.getService(id, signal)),
    retry: catalogRetry,
    enabled,
  });
}
