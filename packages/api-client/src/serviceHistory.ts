import type {
  ApiResponse,
  PagedResponse,
  PaginationParams,
  ServiceHistoryDetail,
  ServiceHistoryItem,
  ServiceHistoryQuery,
} from '@spa/shared-types';
import type { ApiClient } from './index';

const base = '/api/v1/me/service-history';

export const serviceHistoryErrorCodes = {
  appointmentNotFound: 'appointment_not_found',
  validationError: 'validation_error',
} as const;

export type ServiceHistoryParams = ServiceHistoryQuery & PaginationParams;

/** UC-SPA-20: the customer's past visits / service history. */
export class ServiceHistoryApi {
  constructor(private readonly client: ApiClient) {}

  list(params?: ServiceHistoryParams, signal?: AbortSignal) {
    return this.client.get<ApiResponse<PagedResponse<ServiceHistoryItem>>>(base, {
      query: params ? { ...params } : undefined,
      signal,
    });
  }

  get(appointmentId: string, signal?: AbortSignal) {
    return this.client.get<ApiResponse<ServiceHistoryDetail>>(
      `${base}/${encodeURIComponent(appointmentId)}`,
      { signal },
    );
  }
}

export const serviceHistoryQueryKeys = {
  all: ['service-history'] as const,
  list: (params?: ServiceHistoryParams) => ['service-history', 'list', params] as const,
  detail: (id: string) => ['service-history', 'detail', id] as const,
};
