import type { PaginationParams } from './index';

/** Catalog contracts (docs/specs/catalog.md). Prices are whole VND, `DateOnly` values are `yyyy-MM-dd`. */
export type CatalogStatus = 'on_sale' | 'discontinued';
export type CatalogItemType = 'service' | 'package';
export type CatalogSortField = 'name' | 'price';

/** Service category (Q-13). `serviceCount`: on_sale services for guests, every service for the owner. */
export interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  serviceCount: number;
}

export interface ServiceListItem {
  id: string;
  name: string;
  categoryId: string;
  /** Category name. */
  category: string;
  /** Short line for cards and the detail lead (Q-71). */
  shortDescription: string | null;
  price: number;
  durationMinutes: number;
  imageUrl: string | null;
  status: CatalogStatus;
}

/** One step of a service's procedure (Q-71), ordered by `sortOrder`. */
export interface ServiceStep {
  sortOrder: number;
  title: string;
  description: string | null;
  durationMinutes: number | null;
}

export interface ServiceDetail extends ServiceListItem {
  /** Procedure steps; empty when the service has none. */
  steps: readonly ServiceStep[];
  description: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface PackageListItem {
  id: string;
  name: string;
  shortDescription: string | null;
  /** Sum of item service price × sessions: what the sessions cost bought one by one. */
  retailPrice: number;
  price: number;
  validityDays: number;
  totalSessions: number;
  /** Falls back to the first item's service image (BR-CAT-07). */
  imageUrl: string | null;
  status: CatalogStatus;
  saleStartDate: string | null;
  saleEndDate: string | null;
}

export interface PackageItem {
  spaServiceId: string;
  serviceName: string;
  serviceImageUrl: string | null;
  serviceStatus: CatalogStatus;
  /** Current price of one session of the service. */
  servicePrice: number;
  sessionCount: number;
  sortOrder: number;
  minDaysBetweenSessions: number;
  note: string | null;
}

export interface PackageDetail extends PackageListItem {
  description: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  /** Already ordered by `sortOrder`. */
  items: readonly PackageItem[];
}

export interface CatalogSuggestion {
  type: CatalogItemType;
  id: string;
  name: string;
  imageUrl: string | null;
}

/** Paging plus the price range shared by the service and package lists. */
export interface CatalogPriceSearchParams extends PaginationParams {
  minPrice?: number;
  maxPrice?: number;
}

export interface PackageSearchParams extends CatalogPriceSearchParams {
  /** Only packages containing this service. */
  serviceId?: string;
  status?: CatalogStatus;
}

export interface ServiceSearchParams extends CatalogPriceSearchParams {
  categoryId?: string;
  status?: CatalogStatus;
}

/** Owner catalog request DTOs (docs/specs/catalog.md, UC-SPA-09). */
export interface ServiceStepRequest {
  title: string;
  description?: string | null;
  durationMinutes?: number | null;
}

export interface CreateServiceRequest {
  name: string;
  categoryId: string;
  description?: string | null;
  shortDescription?: string | null;
  durationMinutes: number;
  price: number;
  status?: CatalogStatus;
  steps?: readonly ServiceStepRequest[];
}

export interface UpdateServiceRequest {
  name: string;
  categoryId: string;
  description?: string | null;
  shortDescription?: string | null;
  durationMinutes: number;
  price: number;
  steps?: readonly ServiceStepRequest[];
}

export interface PackageItemRequest {
  spaServiceId: string;
  sessionCount: number;
  sortOrder: number;
  minDaysBetweenSessions: number;
  note?: string | null;
}

export interface CreatePackageRequest {
  name: string;
  description?: string | null;
  shortDescription?: string | null;
  price: number;
  validityDays: number;
  saleStartDate?: string | null;
  saleEndDate?: string | null;
  status?: CatalogStatus;
  items?: readonly PackageItemRequest[];
}

export interface UpdatePackageRequest {
  name: string;
  description?: string | null;
  shortDescription?: string | null;
  price: number;
  validityDays: number;
  saleStartDate?: string | null;
  saleEndDate?: string | null;
  items?: readonly PackageItemRequest[];
}

export interface ChangeCatalogStatusRequest {
  status: CatalogStatus;
}

export interface CreateServiceCategoryRequest {
  name: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateServiceCategoryRequest {
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface CatalogImageUploadResponse {
  imageUrl: string;
}

