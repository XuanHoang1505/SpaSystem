/**
 * Revenue and report contracts (UC-SPA-33, BR-RPT-01…05).
 */

export type RevenueGroupBy = 'month' | 'quarter' | 'year';

export type ReportProductType = 'all' | 'service' | 'package';

export type RevenueProductKind = 'service' | 'package';

export interface RevenuePeriodDto {
  readonly label: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly revenue: number;
  readonly serviceRevenue: number;
  readonly packageRevenue: number;
  readonly orderCount: number;
}

export interface UnrecognizedPaymentsDto {
  readonly count: number;
  readonly amount: number;
}

export interface RevenueReportDto {
  readonly fromDate: string;
  readonly toDate: string;
  readonly groupBy: RevenueGroupBy;
  readonly productType: ReportProductType;
  readonly totalRevenue: number;
  readonly serviceRevenue: number;
  readonly packageRevenue: number;
  readonly orderCount: number;
  readonly periods: readonly RevenuePeriodDto[];
  readonly unrecognizedPayments: UnrecognizedPaymentsDto;
}

export interface ProductRevenueDto {
  readonly productType: RevenueProductKind;
  readonly productId: string;
  readonly productName: string;
  readonly quantity: number;
  readonly revenue: number;
  readonly sharePercent: number;
}

export interface RevenueByProductDto {
  readonly fromDate: string;
  readonly toDate: string;
  readonly productType: ReportProductType;
  readonly items: readonly ProductRevenueDto[];
}

export interface RevenueReportQuery {
  readonly fromDate?: string;
  readonly toDate?: string;
  readonly groupBy?: RevenueGroupBy;
  readonly productType?: ReportProductType;
}

export interface RevenueByProductQuery {
  readonly fromDate?: string;
  readonly toDate?: string;
  readonly productType?: ReportProductType;
  readonly top?: number;
}
