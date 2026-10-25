export interface ErrorDetail {
  code: string;
  message: string;
  field?: string | null;
}
export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T | null;
  errors: readonly ErrorDetail[];
  traceId: string;
}
export interface ApiError {
  success: false;
  message: string | null;
  data: null;
  errors: readonly ErrorDetail[];
  traceId: string;
}
export type SortDirection = 'asc' | 'desc';
export interface PaginationParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDirection?: SortDirection;
}
export interface PagedResponse<T> {
  items: readonly T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
export interface HealthResponse {
  status: 'Healthy' | 'Degraded' | 'Unhealthy';
}
export interface SystemStatusResponse {
  application: string;
  status: string;
  utcTime: string;
}
