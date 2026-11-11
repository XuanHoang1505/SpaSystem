import { useMemo } from 'react';
import type { CareHistoryItem, PagedResponse } from '@spa/shared-types';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Button } from '@/components/ui/button';
import { formatLocalDate, formatLocalTime } from '@/lib/formatting/formatters';

export function CareHistoryTable({
  data,
  isLoading,
  isFetching,
  error,
  onRetry,
  hasFilters,
  onResetFilters,
  onPageChange,
  onPageSizeChange,
  onOpen,
}: {
  data: PagedResponse<CareHistoryItem> | undefined;
  isLoading?: boolean;
  isFetching?: boolean;
  error?: string | null;
  onRetry: () => void;
  hasFilters: boolean;
  onResetFilters: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onOpen: (item: CareHistoryItem) => void;
}) {
  const columns = useMemo<readonly DataTableColumn<CareHistoryItem>[]>(
    () => [
      {
        id: 'date',
        header: 'Ngày',
        className: 'whitespace-nowrap',
        cell: (row) => (
          <div className="flex flex-col">
            <span className="font-semibold">{formatLocalDate(row.date)}</span>
            <span className="text-xs text-muted-foreground">
              {`${formatLocalTime(row.startTime)} – ${formatLocalTime(row.endTime)}`}
            </span>
          </div>
        ),
      },
      {
        id: 'customer',
        header: 'Khách',
        cell: (row) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.customer.fullName}</span>
            <span className="text-xs text-muted-foreground">{row.customer.phoneNumber}</span>
          </div>
        ),
      },
      {
        id: 'service',
        header: 'Dịch vụ',
        hideBelow: 'md',
        cell: (row) => (
          <div className="flex flex-col">
            <span>{row.service.name}</span>
            {row.treatmentSession && (
              <span className="text-xs text-muted-foreground">
                {`Buổi ${row.treatmentSession.sequenceNumber}/${row.treatmentSession.totalSessions} · ${row.treatmentSession.packageName}`}
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'skinProfile',
        header: 'Hồ sơ da',
        hideBelow: 'sm',
        cell: (row) =>
          row.skinProfileId ? (
            <StatusBadge label="Đã có" tone="success" />
          ) : (
            <StatusBadge label="Chưa có" tone="neutral" />
          ),
      },
      {
        id: 'allergies',
        header: 'Dị ứng',
        hideBelow: 'sm',
        cell: (row) => (row.hasAllergies ? <StatusBadge label="Có dị ứng" tone="warning" /> : null),
      },
    ],
    [],
  );

  const empty = hasFilters ? (
    <EmptyState
      title="Không có lần chăm sóc nào khớp bộ lọc"
      action={
        <Button variant="outline" onClick={onResetFilters}>
          Xóa bộ lọc
        </Button>
      }
    />
  ) : (
    <EmptyState
      title="Chưa có lần chăm sóc nào"
      description="Buổi chăm sóc bạn xác nhận hoàn thành sẽ hiện ở đây."
    />
  );

  return (
    <DataTable
      columns={columns}
      data={data?.items}
      getRowId={(row) => row.appointmentId}
      caption="Lịch sử khách đã chăm sóc"
      isLoading={isLoading}
      isFetching={isFetching}
      error={error}
      onRetry={onRetry}
      empty={empty}
      page={
        data
          ? {
              pageNumber: data.pageNumber,
              pageSize: data.pageSize,
              totalCount: data.totalCount,
              totalPages: data.totalPages,
            }
          : undefined
      }
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      onRowClick={onOpen}
    />
  );
}
