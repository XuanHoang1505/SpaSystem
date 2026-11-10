import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AppointmentStatus, ServiceHistoryItem } from '@spa/shared-types';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import type { DataTableColumn } from '@/components/shared/DataTable/dataTable.types';
import { Button } from '@/components/ui/button';
import { OrderDetailSheet } from '@/features/orders';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatLocalDate } from '@/lib/formatting/formatters';
import { serviceHistoryStatusBadge } from '../historyStatus';
import { useServiceHistory } from '../hooks/useServiceHistory';
import {
  ServiceHistoryFilterToolbar,
  type ServiceHistoryFilters,
} from './ServiceHistoryFilterToolbar';
import { ServiceHistoryDetailSheet } from './ServiceHistoryDetailSheet';

export function ServiceHistoryView() {
  useDocumentTitle('Lịch sử sử dụng dịch vụ');
  const [searchParams, setSearchParams] = useSearchParams();

  const fromDate = searchParams.get('fromDate') || undefined;
  const toDate = searchParams.get('toDate') || undefined;
  const spaServiceId = searchParams.get('spaServiceId') || undefined;
  const statusParam = searchParams.get('status') as AppointmentStatus | null;
  const status =
    statusParam && ['completed', 'no_show'].includes(statusParam) ? statusParam : undefined;

  const pageNumber = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10));

  const filters: ServiceHistoryFilters = useMemo(
    () => ({ fromDate, toDate, spaServiceId, status }),
    [fromDate, toDate, spaServiceId, status],
  );

  const { data, isLoading, isFetching, isError, refetch } = useServiceHistory({
    ...filters,
    pageNumber,
    pageSize,
  });

  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<{ id: string; code: string } | null>(null);

  const handleFilterChange = (newFilters: ServiceHistoryFilters) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newFilters.fromDate) next.set('fromDate', newFilters.fromDate);
      else next.delete('fromDate');

      if (newFilters.toDate) next.set('toDate', newFilters.toDate);
      else next.delete('toDate');

      if (newFilters.spaServiceId) next.set('spaServiceId', newFilters.spaServiceId);
      else next.delete('spaServiceId');

      if (newFilters.status) next.set('status', newFilters.status);
      else next.delete('status');

      next.set('page', '1');
      return next;
    });
  };

  const handleResetFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const handlePageChange = (page: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(page));
      return next;
    });
  };

  const handlePageSizeChange = (size: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('pageSize', String(size));
      next.set('page', '1');
      return next;
    });
  };

  const columns: DataTableColumn<ServiceHistoryItem>[] = useMemo(
    () => [
      {
        id: 'time',
        header: 'Thời gian',
        cell: (row) => (
          <div className="space-y-0.5">
            <div className="font-medium text-foreground">{formatLocalDate(row.date)}</div>
            <div className="text-xs text-muted-foreground">{`${row.startTime} – ${row.endTime}`}</div>
          </div>
        ),
      },
      {
        id: 'service',
        header: 'Dịch vụ',
        cell: (row) => <span className="font-medium text-foreground">{row.serviceName}</span>,
      },
      {
        id: 'source',
        header: 'Nguồn dịch vụ',
        hideBelow: 'sm',
        cell: (row) =>
          row.source === 'package' ? (
            <div className="space-y-0.5">
              <span className="inline-flex items-center rounded-md bg-secondary/30 px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                {`Gói: ${row.packageName}`}
              </span>
              {row.sequenceNumber !== undefined && (
                <div className="text-xs text-muted-foreground">{`Buổi ${row.sequenceNumber}`}</div>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Dịch vụ lẻ
            </span>
          ),
      },
      {
        id: 'staff',
        header: 'Kỹ thuật viên',
        hideBelow: 'md',
        cell: (row) => <span className="text-sm text-foreground">{row.staff.fullName}</span>,
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: (row) => {
          const badge = serviceHistoryStatusBadge(row.status);
          return <StatusBadge label={badge.label} tone={badge.tone} status={row.status} />;
        },
      },
      {
        id: 'actions',
        header: '',
        align: 'end',
        cell: (row) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedAppointmentId(row.appointmentId);
            }}
            className="text-xs font-medium text-primary hover:text-primary/90"
          >
            Chi tiết
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tài khoản khách hàng"
        title="Lịch sử sử dụng dịch vụ"
        description="Xem lại các lần sử dụng dịch vụ và kết quả chăm sóc da của bạn."
      />

      <ServiceHistoryFilterToolbar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      <DataTable<ServiceHistoryItem>
        caption="Bảng lịch sử sử dụng dịch vụ"
        columns={columns}
        data={data?.items}
        getRowId={(row) => row.appointmentId}
        isLoading={isLoading}
        isFetching={isFetching}
        error={isError ? 'Không thể tải lịch sử sử dụng dịch vụ. Vui lòng thử lại.' : null}
        onRetry={() => refetch()}
        onRowClick={(row) => setSelectedAppointmentId(row.appointmentId)}
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
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        empty={
          <div className="py-12 text-center text-sm text-muted-foreground">
            {filters.fromDate || filters.toDate || filters.spaServiceId || filters.status
              ? 'Không có lần sử dụng dịch vụ nào khớp với bộ lọc.'
              : 'Bạn chưa có lịch sử sử dụng dịch vụ nào.'}
          </div>
        }
      />

      {/* Detail sheet */}
      <ServiceHistoryDetailSheet
        appointmentId={selectedAppointmentId}
        open={selectedAppointmentId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedAppointmentId(null);
        }}
        onViewOrder={(order) => setSelectedOrder(order)}
      />

      {/* Order detail sheet */}
      <OrderDetailSheet order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </div>
  );
}
