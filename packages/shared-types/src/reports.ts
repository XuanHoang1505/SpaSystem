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

/** Query of `GET /reports/revenue/leaders`; `top` defaults to 5. */
export interface RevenueLeadersQuery {
  readonly fromDate?: string;
  readonly toDate?: string;
  readonly top?: number;
}

/** Revenue counts recognized payments only, like the revenue report; `orderCount` is distinct orders. */
export interface TopCustomerDto {
  readonly customerId: string;
  readonly fullName: string;
  readonly phoneNumber: string;
  readonly orderCount: number;
  readonly revenue: number;
}

/** Appointments dated in the range: completed, and every pending/confirmed/completed/no-show one. */
export interface TopStaffDto {
  readonly staffMemberId: string;
  readonly fullName: string;
  readonly completedCount: number;
  readonly appointmentCount: number;
}

export interface RevenueLeadersDto {
  readonly fromDate: string;
  readonly toDate: string;
  readonly topCustomers: readonly TopCustomerDto[];
  readonly topStaff: readonly TopStaffDto[];
}
