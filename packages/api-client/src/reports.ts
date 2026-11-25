import type {
  ApiResponse,
  RevenueByProductDto,
  RevenueByProductQuery,
  RevenueLeadersDto,
  RevenueLeadersQuery,
  RevenueReportDto,
  RevenueReportQuery,
} from '@spa/shared-types';
import type { ApiClient } from './index';

const base = '/api/v1/reports';

export class ReportsApi {
  constructor(private readonly client: ApiClient) {}

  getRevenue(
    query?: RevenueReportQuery,
    signal?: AbortSignal,
  ): Promise<ApiResponse<RevenueReportDto>> {
    return this.client.get<ApiResponse<RevenueReportDto>>(`${base}/revenue`, {
      query: query ? { ...query } : undefined,
      signal,
    });
  }

  getByProduct(
    query?: RevenueByProductQuery,
    signal?: AbortSignal,
  ): Promise<ApiResponse<RevenueByProductDto>> {
    return this.client.get<ApiResponse<RevenueByProductDto>>(`${base}/revenue/by-product`, {
      query: query ? { ...query } : undefined,
      signal,
    });
  }

  getLeaders(
    query?: RevenueLeadersQuery,
    signal?: AbortSignal,
  ): Promise<ApiResponse<RevenueLeadersDto>> {
    return this.client.get<ApiResponse<RevenueLeadersDto>>(`${base}/revenue/leaders`, {
      query: query ? { ...query } : undefined,
      signal,
    });
  }

  exportRevenue(query?: RevenueReportQuery, signal?: AbortSignal): Promise<Blob> {
    return this.client.getBlob(`${base}/revenue/export`, {
      query: query ? { ...query } : undefined,
      signal,
    });
  }
}

export const reportErrorCodes = {
  validationError: 'validation_error',
  unauthorized: 'unauthorized',
  forbidden: 'forbidden',
} as const;

export const reportsQueryKeys = {
  all: ['reports'] as const,
  revenue: (query?: RevenueReportQuery) =>
    [...reportsQueryKeys.all, 'revenue', query ?? {}] as const,
  byProduct: (query?: RevenueByProductQuery) =>
    [...reportsQueryKeys.all, 'by-product', query ?? {}] as const,
  leaders: (query?: RevenueLeadersQuery) =>
    [...reportsQueryKeys.all, 'leaders', query ?? {}] as const,
};
