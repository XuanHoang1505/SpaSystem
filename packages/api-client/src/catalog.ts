import type {
  ApiResponse,
  CatalogImageUploadResponse,
  CatalogSuggestion,
  ChangeCatalogStatusRequest,
  CreatePackageRequest,
  CreateServiceCategoryRequest,
  CreateServiceRequest,
  PackageDetail,
  PackageListItem,
  PackageSearchParams,
  PagedResponse,
  ServiceCategory,
  ServiceDetail,
  ServiceListItem,
  ServiceSearchParams,
  UpdatePackageRequest,
  UpdateServiceCategoryRequest,
  UpdateServiceRequest,
} from '@spa/shared-types';
import type { ApiClient, QueryValue } from './index';

const base = '/api/v1';

/** Error codes of the catalog endpoints (docs/specs/catalog.md); branch on these, never on the message. */
export const catalogErrorCodes = {
  serviceNotFound: 'service_not_found',
  packageNotFound: 'package_not_found',
  validationError: 'validation_error',
  serviceCategoryNotFound: 'service_category_not_found',
  serviceCategoryExists: 'service_category_exists',
  serviceCategoryInUse: 'service_category_in_use',
  packageServiceNotFound: 'package_service_not_found',
  packageServiceDiscontinued: 'package_service_discontinued',
  requestTooLarge: 'request_too_large',
  imageStorageUnavailable: 'image_storage_unavailable',
} as const;

const asQuery = (
  params: ServiceSearchParams | PackageSearchParams,
): Record<string, QueryValue> => ({
  ...params,
});

/** UC-SPA-06/07: public catalog reads. UC-SPA-09: owner catalog management. */
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

  createService(body: CreateServiceRequest, signal?: AbortSignal) {
    return this.client.post<CreateServiceRequest, ApiResponse<ServiceDetail>>(`${base}/services`, body, {
      signal,
    });
  }

  updateService(id: string, body: UpdateServiceRequest, signal?: AbortSignal) {
    return this.client.put<UpdateServiceRequest, ApiResponse<ServiceDetail>>(
      `${base}/services/${encodeURIComponent(id)}`,
      body,
      { signal },
    );
  }

  changeServiceStatus(id: string, body: ChangeCatalogStatusRequest, signal?: AbortSignal) {
    return this.client.patch<ChangeCatalogStatusRequest, void>(
      `${base}/services/${encodeURIComponent(id)}/status`,
      body,
      { signal },
    );
  }

  uploadServiceImage(id: string, file: File | Blob, signal?: AbortSignal) {
    const formData = new FormData();
    formData.append('file', file);
    return this.client.post<FormData, ApiResponse<CatalogImageUploadResponse>>(
      `${base}/services/${encodeURIComponent(id)}/image`,
      formData,
      { signal },
    );
  }

  deleteServiceImage(id: string, signal?: AbortSignal) {
    return this.client.delete<void>(`${base}/services/${encodeURIComponent(id)}/image`, {
      signal,
    });
  }

  listServiceCategories(signal?: AbortSignal) {
    return this.client.get<ApiResponse<readonly ServiceCategory[]>>(`${base}/service-categories`, {
      signal,
    });
  }

  createCategory(body: CreateServiceCategoryRequest, signal?: AbortSignal) {
    return this.client.post<CreateServiceCategoryRequest, ApiResponse<ServiceCategory>>(
      `${base}/service-categories`,
      body,
      { signal },
    );
  }

  updateCategory(id: string, body: UpdateServiceCategoryRequest, signal?: AbortSignal) {
    return this.client.put<UpdateServiceCategoryRequest, ApiResponse<ServiceCategory>>(
      `${base}/service-categories/${encodeURIComponent(id)}`,
      body,
      { signal },
    );
  }

  deleteCategory(id: string, signal?: AbortSignal) {
    return this.client.delete<void>(
      `${base}/service-categories/${encodeURIComponent(id)}`,
      { signal },
    );
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

  createPackage(body: CreatePackageRequest, signal?: AbortSignal) {
    return this.client.post<CreatePackageRequest, ApiResponse<PackageDetail>>(`${base}/packages`, body, {
      signal,
    });
  }

  updatePackage(id: string, body: UpdatePackageRequest, signal?: AbortSignal) {
    return this.client.put<UpdatePackageRequest, ApiResponse<PackageDetail>>(
      `${base}/packages/${encodeURIComponent(id)}`,
      body,
      { signal },
    );
  }

  changePackageStatus(id: string, body: ChangeCatalogStatusRequest, signal?: AbortSignal) {
    return this.client.patch<ChangeCatalogStatusRequest, void>(
      `${base}/packages/${encodeURIComponent(id)}/status`,
      body,
      { signal },
    );
  }

  uploadPackageImage(id: string, file: File | Blob, signal?: AbortSignal) {
    const formData = new FormData();
    formData.append('file', file);
    return this.client.post<FormData, ApiResponse<CatalogImageUploadResponse>>(
      `${base}/packages/${encodeURIComponent(id)}/image`,
      formData,
      { signal },
    );
  }

  deletePackageImage(id: string, signal?: AbortSignal) {
    return this.client.delete<void>(`${base}/packages/${encodeURIComponent(id)}/image`, {
      signal,
    });
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
  services: (params?: ServiceSearchParams) =>
    params !== undefined
      ? (['catalog', 'services', 'list', params] as const)
      : (['catalog', 'services'] as const),
  service: (id: string) => ['catalog', 'services', 'detail', id] as const,
  categories: ['catalog', 'service-categories'] as const,
  packages: (params?: PackageSearchParams) =>
    params !== undefined
      ? (['catalog', 'packages', 'list', params] as const)
      : (['catalog', 'packages'] as const),
  package: (id: string) => ['catalog', 'packages', 'detail', id] as const,
  suggestions: (search: string) => ['catalog', 'suggestions', search] as const,
};
