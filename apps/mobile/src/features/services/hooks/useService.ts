import { useQuery } from '@tanstack/react-query';
import { catalogQueryKeys } from '@spa/api-client';
import { callCatalog } from '@/lib/api/catalog';
import { catalogRetry } from './catalogRetry';

export function useService(id: string) {
  return useQuery({
    queryKey: catalogQueryKeys.service(id),
    queryFn: ({ signal }) => callCatalog((api) => api.getService(id, signal)),
    retry: catalogRetry,
    staleTime: 60 * 1000,
    enabled: Boolean(id),
  });
}
