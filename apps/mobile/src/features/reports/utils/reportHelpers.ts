import type {
  ReportProductType,
  RevenueGroupBy,
  RevenueProductKind,
} from '@spa/shared-types';

const vnDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Lấy ngày hiện tại yyyy-MM-dd theo giờ Việt Nam (UTC+7). */
export function getVietnamToday(now: Date = new Date()): string {
  return vnDateFormatter.format(now);
}

/** Lấy ngày đầu năm yyyy-01-01 theo giờ Việt Nam. */
export function getVietnamYearStart(today: string = getVietnamToday()): string {
  const [year] = today.split('-');
  return `${year ?? '2026'}-01-01`;
}

/** Cộng/trừ số ngày vào chuỗi yyyy-MM-dd. */
export function addDaysToDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 2026, (month ?? 1) - 1, (day ?? 1) + days));
  return date.toISOString().slice(0, 10);
}

export interface DatePreset {
  readonly id: string;
  readonly label: string;
  readonly fromDate: string;
  readonly toDate: string;
}

/** Các mốc thời gian lọc nhanh. */
export function getDatePresets(today: string = getVietnamToday()): readonly DatePreset[] {
  const [yearStr, monthStr] = today.split('-');
  const year = Number(yearStr) || 2026;
  const month = Number(monthStr) || 1;

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
      id: 'this_quarter',
      label: 'Quý này',
      fromDate: `${year}-${quarterStartMonth}-01`,
      toDate: today,
    },
    {
      id: 'this_month',
      label: 'Tháng này',
      fromDate: `${year}-${String(month).padStart(2, '0')}-01`,
      toDate: today,
    },
    {
      id: 'last_30_days',
      label: '30 ngày qua',
      fromDate: addDaysToDate(today, -30),
      toDate: today,
    },
    {
      id: 'last_year',
      label: 'Năm trước',
      fromDate: `${year - 1}-01-01`,
      toDate: `${year - 1}-12-31`,
    },
  ];
}

export const groupByOptions: readonly { readonly value: RevenueGroupBy; readonly label: string }[] =
  [
    { value: 'month', label: 'Tháng' },
    { value: 'quarter', label: 'Quý' },
    { value: 'year', label: 'Năm' },
  ];

export const productTypeOptions: readonly {
  readonly value: ReportProductType;
  readonly label: string;
}[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'service', label: 'Dịch vụ lẻ' },
  { value: 'package', label: 'Gói liệu trình' },
];

export const productKindBadgeConfig: Record<
  RevenueProductKind,
  { readonly label: string; readonly bg: string; readonly text: string; readonly border: string }
> = {
  service: {
    label: 'Dịch vụ lẻ',
    bg: '#E2EBF3',
    text: '#2F5677',
    border: '#C9D9E8',
  },
  package: {
    label: 'Gói liệu trình',
    bg: '#E3EFE5',
    text: '#386647',
    border: '#C7DECB',
  },
};

export function formatSharePercent(percent: number): string {
  return `${percent.toFixed(1)}%`;
}

/** Kiểm tra khoảng ngày hợp lệ theo BR-RPT-03. */
export function validateDateRange(fromDate: string, toDate: string): string | null {
  if (!fromDate || !toDate) return 'Vui lòng chọn đầy đủ từ ngày và đến ngày.';
  if (fromDate > toDate) return 'Từ ngày không được lớn hơn đến ngày.';

  const fromYear = Number(fromDate.slice(0, 4));
  const toYear = Number(toDate.slice(0, 4));
  if (fromYear < 2000 || toYear > 2100) return 'Năm báo cáo phải trong khoảng 2000 - 2100.';

  // Tối đa 5 năm
  const diffTime = Math.abs(new Date(toDate).getTime() - new Date(fromDate).getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays > 5 * 366) return 'Khoảng thời gian báo cáo tối đa là 5 năm.';

  return null;
}
