import { addDays, vietnamNow } from '@/lib/formatting/vietnamTime';
import type {
  ReportProductType,
  RevenueGroupBy,
  RevenueProductKind,
} from '@spa/shared-types';

export function getVietnamToday(): string {
  return vietnamNow().date;
}

export function getVietnamYearStart(today: string = getVietnamToday()): string {
  const [year] = today.split('-');
  return `${year}-01-01`;
}

export interface DatePreset {
  readonly id: string;
  readonly label: string;
  readonly fromDate: string;
  readonly toDate: string;
}

export function getDatePresets(today: string = getVietnamToday()): readonly DatePreset[] {
  const [yearStr, monthStr] = today.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);

  const quarter = Math.floor((month - 1) / 3) + 1;
  const quarterStartMonth = String((quarter - 1) * 3 + 1).padStart(2, '0');

  return [
    {
      id: 'this_year',
      label: 'Năm nay',
      fromDate: `${year}-01-01`,
      toDate: today,
    },
    {
      id: 'last_year',
      label: 'Năm trước',
      fromDate: `${year - 1}-01-01`,
      toDate: `${year - 1}-12-31`,
    },
    {
      id: 'this_quarter',
      label: 'Quý này',
      fromDate: `${year}-${quarterStartMonth}-01`,
      toDate: today,
    },
    {
      id: 'this_month',
      label: 'Tháng này',
      fromDate: `${year}-${monthStr}-01`,
      toDate: today,
    },
    {
      id: 'last_30_days',
      label: '30 ngày qua',
      fromDate: addDays(today, -30),
      toDate: today,
    },
  ];
}

export function formatSharePercent(percent: number): string {
  return `${percent.toFixed(1)}%`;
}

export const groupByLabels: Record<RevenueGroupBy, string> = {
  month: 'Theo tháng',
  quarter: 'Theo quý',
  year: 'Theo năm',
};

export const productTypeLabels: Record<ReportProductType, string> = {
  all: 'Tất cả sản phẩm',
  service: 'Dịch vụ lẻ',
  package: 'Gói dịch vụ',
};

export const productKindConfig: Record<
  RevenueProductKind,
  { readonly label: string; readonly tone: 'info' | 'success' }
> = {
  service: { label: 'Dịch vụ lẻ', tone: 'info' },
  package: { label: 'Gói dịch vụ', tone: 'success' },
};
