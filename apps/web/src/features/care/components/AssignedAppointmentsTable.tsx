import { useMemo } from 'react';
import type { AssignedAppointment } from '@spa/shared-types';
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { appointmentStatusBadge } from '@/features/bookings/appointmentStatus';
import { formatLocalDate, formatLocalTime } from '@/lib/formatting/formatters';
import { weekdayName } from '@/lib/formatting/vietnamTime';

export function AssignedAppointmentsTable({
  data,
  isLoading,
  isFetching,
  error,
  onRetry,
  emptyDescription,
  onOpen,
}: {
  data: readonly AssignedAppointment[] | undefined;
  isLoading?: boolean;
  isFetching?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyDescription: string;
  onOpen: (id: string) => void;
}) {
  const columns = useMemo<readonly DataTableColumn<AssignedAppointment>[]>(
    () => [
      {
        id: 'date',
        header: 'Ngày',
        className: 'whitespace-nowrap',
        cell: (row) => (
          <div className="flex flex-col">
            <span className="font-semibold">{formatLocalDate(row.date)}</span>
            <span className="text-xs text-muted-foreground">{weekdayName(row.date)}</span>
          </div>
        ),
      },
      {
        id: 'time',
        header: 'Giờ',
        className: 'whitespace-nowrap',
        cell: (row) => `${formatLocalTime(row.startTime)} – ${formatLocalTime(row.endTime)}`,
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
        id: 'notes',
        header: 'Lưu ý',
        hideBelow: 'sm',
        cell: (row) => (
          <div className="flex flex-wrap gap-1.5">
            {row.hasAllergies && <StatusBadge label="Có dị ứng" tone="warning" />}
            {row.hasSkinProfile && <StatusBadge label="Đã có hồ sơ da" tone="info" />}
          </div>
        ),
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

  return (
    <DataTable
      columns={columns}
      data={data}
      getRowId={(row) => row.id}
      caption="Lịch hẹn được phân công"
      isLoading={isLoading}
      isFetching={isFetching}
      error={error}
      onRetry={onRetry}
      empty={<EmptyState title="Chưa có lịch hẹn" description={emptyDescription} />}
      onRowClick={(row) => onOpen(row.id)}
    />
  );
}
