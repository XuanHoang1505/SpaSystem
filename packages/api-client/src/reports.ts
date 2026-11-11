import type {
  ApiResponse,
  RevenueByProductDto,
  RevenueByProductQuery,
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

  exportRevenue(
    query?: RevenueReportQuery,
    signal?: AbortSignal,
  ): Promise<Blob> {
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
