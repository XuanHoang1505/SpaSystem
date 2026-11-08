import type {
  ApiResponse,
  CatalogSuggestion,
  PackageDetail,
  PackageListItem,
  PackageSearchParams,
  PagedResponse,
  ServiceCategory,
  ServiceDetail,
  ServiceListItem,
  ServiceSearchParams,
} from '@spa/shared-types';
import type { ApiClient, QueryValue } from './index';

const base = '/api/v1';

/** Error codes of the catalog endpoints (docs/specs/catalog.md); branch on these, never on the message. */
export const catalogErrorCodes = {
  serviceNotFound: 'service_not_found',
  packageNotFound: 'package_not_found',
  validationError: 'validation_error',
} as const;

const asQuery = (
  params: ServiceSearchParams | PackageSearchParams,
): Record<string, QueryValue> => ({
  ...params,
});

/** UC-SPA-06/07: public catalog reads. */
export class CatalogApi {
  constructor(private readonly client: ApiClient) {}

  searchServices(params: ServiceSearchParams, signal?: AbortSignal) {
    return this.client.get<ApiResponse<PagedResponse<ServiceListItem>>>(`${base}/services`, {
      query: asQuery(params),
      signal,
    });
  }

  getService(id: string, signal?: AbortSignal) {
    return this.client.get<ApiResponse<ServiceDetail>>(
      `${base}/services/${encodeURIComponent(id)}`,
      { signal },
    );
  }

  listServiceCategories(signal?: AbortSignal) {
    return this.client.get<ApiResponse<readonly ServiceCategory[]>>(`${base}/service-categories`, {
      signal,
    });
  }

  searchPackages(params: PackageSearchParams, signal?: AbortSignal) {
    return this.client.get<ApiResponse<PagedResponse<PackageListItem>>>(`${base}/packages`, {
      query: asQuery(params),
      signal,
    });
  }

  getPackage(id: string, signal?: AbortSignal) {
    return this.client.get<ApiResponse<PackageDetail>>(
      `${base}/packages/${encodeURIComponent(id)}`,
      { signal },
    );
  }

  getSuggestions(search: string, signal?: AbortSignal) {
    return this.client.get<ApiResponse<readonly CatalogSuggestion[]>>(
      `${base}/catalog/suggestions`,
      { query: { search }, signal },
    );
  }
}

export const catalogQueryKeys = {
  all: ['catalog'] as const,
  services: (params: ServiceSearchParams) => ['catalog', 'services', 'list', params] as const,
  service: (id: string) => ['catalog', 'services', 'detail', id] as const,
  categories: ['catalog', 'service-categories'] as const,
  packages: (params: PackageSearchParams) => ['catalog', 'packages', 'list', params] as const,
  package: (id: string) => ['catalog', 'packages', 'detail', id] as const,
  suggestions: (search: string) => ['catalog', 'suggestions', search] as const,
};
