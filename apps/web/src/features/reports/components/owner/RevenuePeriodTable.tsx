import { useMemo } from 'react';
import { CalendarRangeIcon } from 'lucide-react';
import type { RevenuePeriodDto } from '@spa/shared-types';
import {
  DataTable,
  type DataTableColumn,
} from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatLocalDate, formatNumber } from '@/lib/formatting/formatters';

export interface RevenuePeriodTableProps {
  readonly periods?: readonly RevenuePeriodDto[] | null;
  readonly isLoading?: boolean;
}

export function RevenuePeriodTable({ periods, isLoading }: RevenuePeriodTableProps) {
  const items = useMemo(() => periods ?? [], [periods]);

  const columns = useMemo<readonly DataTableColumn<RevenuePeriodDto>[]>(
    () => [
      {
        id: 'label',
        header: 'Kỳ báo cáo',
        className: 'w-32',
        cell: (row) => (
          <span className="font-semibold text-foreground">{row.label}</span>
        ),
      },
      {
        id: 'dateRange',
        header: 'Khoảng ngày',
        hideBelow: 'sm',
        cell: (row) => (
          <span className="text-xs text-muted-foreground">
            {formatLocalDate(row.periodStart)} – {formatLocalDate(row.periodEnd)}
          </span>
        ),
      },
      {
        id: 'serviceRevenue',
        header: 'Doanh thu dịch vụ',
        cell: (row) => (
          <div className="flex items-center gap-1.5 font-medium text-chart-1">
            <span className="size-2 rounded-full bg-chart-1" />
            <span>{formatCurrency(row.serviceRevenue)}</span>
          </div>
        ),
      },
      {
        id: 'packageRevenue',
        header: 'Doanh thu gói',
        cell: (row) => (
          <div className="flex items-center gap-1.5 font-medium text-chart-2">
            <span className="size-2 rounded-full bg-chart-2" />
            <span>{formatCurrency(row.packageRevenue)}</span>
          </div>
        ),
      },
      {
        id: 'revenue',
        header: 'Tổng doanh thu',
        cell: (row) => (
          <span className="font-heading font-bold text-foreground">
            {formatCurrency(row.revenue)}
          </span>
        ),
      },
      {
        id: 'orderCount',
        header: 'Số đơn',
        hideBelow: 'md',
        className: 'w-28',
        cell: (row) => (
          <span className="inline-flex items-center rounded-full bg-secondary/80 px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
            {formatNumber(row.orderCount)} đơn
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <Card className="rounded-xl border border-border/70 bg-card shadow-xs overflow-hidden p-0">
      <CardHeader className="border-b border-border/40 bg-muted/15 px-5 py-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-2xs shrink-0">
            <CalendarRangeIcon className="size-5" />
          </div>
          <div>
            <CardTitle className="font-heading text-base font-semibold tracking-tight text-foreground">
              Bảng số liệu chi tiết theo từng kỳ
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <DataTable<RevenuePeriodDto>
          columns={columns}
          data={items}
          getRowId={(row: RevenuePeriodDto) => row.label}
          caption="Chi tiết doanh thu theo từng kỳ"
          isLoading={isLoading}
          empty={
            <EmptyState
              title="Chưa có dữ liệu kỳ báo cáo"
              description="Vui lòng chọn khoảng thời gian khác."
            />
          }
        />
      </CardContent>
    </Card>
  );
}
