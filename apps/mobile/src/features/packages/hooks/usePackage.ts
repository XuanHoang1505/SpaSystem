import { useQuery } from '@tanstack/react-query';
import { catalogQueryKeys } from '@spa/api-client';
import { callCatalog } from '@/lib/api/catalog';
import { catalogRetry } from '@/features/services/hooks/catalogRetry';

export function usePackage(id: string) {
  return useQuery({
    queryKey: catalogQueryKeys.package(id),
    queryFn: ({ signal }) => callCatalog((api) => api.getPackage(id, signal)),
    retry: catalogRetry,
    staleTime: 60 * 1000,
    enabled: Boolean(id),
  });
}
