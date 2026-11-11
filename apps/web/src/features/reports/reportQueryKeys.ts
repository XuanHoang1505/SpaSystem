import type { RevenueByProductQuery, RevenueReportQuery } from '@spa/shared-types';

export const reportsQueryKeys = {
  all: ['reports'] as const,
  revenue: (query?: RevenueReportQuery) =>
    [...reportsQueryKeys.all, 'revenue', query ?? {}] as const,
  byProduct: (query?: RevenueByProductQuery) =>
    [...reportsQueryKeys.all, 'by-product', query ?? {}] as const,
};
