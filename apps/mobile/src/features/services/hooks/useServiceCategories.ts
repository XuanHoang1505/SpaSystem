import { useQuery } from '@tanstack/react-query';
import { catalogQueryKeys } from '@spa/api-client';
import { callCatalog } from '@/lib/api/catalog';
import { catalogRetry } from './catalogRetry';

export function useServiceCategories() {
  return useQuery({
    queryKey: catalogQueryKeys.categories,
    queryFn: ({ signal }) => callCatalog((api) => api.listServiceCategories(signal)),
    retry: catalogRetry,
    staleTime: 5 * 60 * 1000,
  });
}
