import type { ApiResponse, PurchasedPackage, PurchasedService, Purchases } from '@spa/shared-types';
import type { ApiClient } from './index';

const base = '/api/v1/me/purchases';

export const purchaseErrorCodes = {
  entitlementNotFound: 'entitlement_not_found',
  customerPackageNotFound: 'customer_package_not_found',
  validationError: 'validation_error',
} as const;

/** UC-SPA-18: services and packages the customer has bought. */
export class PurchasesApi {
  constructor(private readonly client: ApiClient) {}

  list(signal?: AbortSignal) {
    return this.client.get<ApiResponse<Purchases>>(base, { signal });
  }

  getPackage(id: string, signal?: AbortSignal) {
    return this.client.get<ApiResponse<PurchasedPackage>>(
      `${base}/packages/${encodeURIComponent(id)}`,
      { signal },
    );
  }

  getService(id: string, signal?: AbortSignal) {
    return this.client.get<ApiResponse<PurchasedService>>(
      `${base}/services/${encodeURIComponent(id)}`,
      { signal },
    );
  }
}

export const purchasesQueryKeys = {
  all: ['purchases'] as const,
  list: ['purchases', 'list'] as const,
  package: (id: string) => ['purchases', 'package', id] as const,
};
