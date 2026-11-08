import { useQuery } from '@tanstack/react-query';
import { catalogQueryKeys } from '@spa/api-client';
import { callCatalog } from '@/lib/api/catalog';
import { catalogRetry } from './catalogRetry';
import { useCatalogQueryEnabled } from './useCatalogQueryEnabled';

/** UC-SPA-06 A1: suggestions only from 2 characters (the API answers 400 below that). */
export function useCatalogSuggestions(search: string) {
  const term = search.trim();
  const ready = useCatalogQueryEnabled();
  return useQuery({
    queryKey: catalogQueryKeys.suggestions(term),
    queryFn: ({ signal }) => callCatalog((api) => api.getSuggestions(term, signal)),
    retry: catalogRetry,
    enabled: ready && term.length >= 2,
  });
}
