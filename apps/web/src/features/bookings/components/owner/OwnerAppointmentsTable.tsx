import { useMemo } from 'react';
import type { AppointmentListItem } from '@spa/shared-types';
import {
  DataTable,
  type DataTableColumn,
  type DataTablePage,
  type DataTableRowAction,
} from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Button } from '@/components/ui/button';
import { formatLocalDate } from '@/lib/formatting/formatters';
import {
  appointmentStatusBadge,
  ownerActionLabels,
  ownerAppointmentActions,
  type OwnerAppointmentAction,
} from '../../appointmentStatus';

export interface OwnerAppointmentsTableProps {
  data: readonly AppointmentListItem[] | undefined;
  page?: DataTablePage;
  isLoading?: boolean;
  isFetching?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onPageChange?: (pageNumber: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  hasFilters: boolean;
  onResetFilters: () => void;
  onOpen: (id: string) => void;
  onAction: (action: OwnerAppointmentAction, appointment: AppointmentListItem) => void;
}

export function OwnerAppointmentsTable({
  data,
  page,
  isLoading,
  isFetching,
  error,
  onRetry,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  hasFilters,
  onResetFilters,
  onOpen,
  onAction,
}: OwnerAppointmentsTableProps) {
  const columns = useMemo<readonly DataTableColumn<AppointmentListItem>[]>(
    () => [
      {
        id: 'time',
        header: 'Thời gian',
        cell: (row) => (
          <div className="flex flex-col">
            <span className="font-semibold">{formatLocalDate(row.date)}</span>
            <span className="text-xs text-muted-foreground">{`${row.startTime} – ${row.endTime}`}</span>
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
        cell: (row) => row.service.name,
      },
      {
        id: 'staff',
        header: 'Nhân viên',
        hideBelow: 'sm',
        cell: (row) => row.staff.fullName,
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: (row) => {
          const badge = appointmentStatusBadge(row.status);
          return <StatusBadge label={badge.label} tone={badge.tone} status={row.status} />;
        },
      },
    ],
    [],
  );

  const rowActions = (row: AppointmentListItem): DataTableRowAction<AppointmentListItem>[] => [
    {
      label: 'Xem chi tiết',
      onSelect: () => onOpen(row.id),
    },
    ...ownerAppointmentActions(row.status).map((action) => ({
      label: ownerActionLabels[action],
      variant: action === 'cancel' ? ('destructive' as const) : undefined,
      onSelect: () => onAction(action, row),
    })),
  ];

  const empty = hasFilters ? (
    <EmptyState
      title="Không có lịch hẹn nào khớp với bộ lọc."
      action={
        <Button variant="outline" onClick={onResetFilters}>
          Xóa bộ lọc
        </Button>
      }
    />
  ) : (
    <EmptyState title="Chưa có lịch hẹn nào trong khoảng ngày này." />
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      getRowId={(row) => row.id}
      caption="Danh sách lịch hẹn"
      isLoading={isLoading}
      isFetching={isFetching}
      error={error}
      onRetry={onRetry}
      empty={empty}
      page={page}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      pageSizeOptions={pageSizeOptions}
      onRowClick={(row) => onOpen(row.id)}
      rowActions={rowActions}
    />
  );
}
