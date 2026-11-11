import { useMemo } from 'react';
import { EyeIcon, PencilIcon, PowerIcon, UserCheckIcon } from 'lucide-react';
import type { TreatmentPlanListItemDto } from '@spa/shared-types';
import {
  DataTable,
  type DataTableColumn,
  type DataTablePage,
  type DataTableRowAction,
} from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { packageStatusBadge } from '@/features/purchases/purchaseStatus';
import { formatLocalDate } from '@/lib/formatting/formatters';
import { vietnamDateOf } from '@/lib/formatting/vietnamTime';
import {
  treatmentPlanStatusBadge,
  treatmentSessionStatusBadge,
} from '../../treatmentStatus';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (!first) return 'KH';
  if (parts.length === 1 || !last) return first.slice(0, 2).toUpperCase();
  const firstChar = first[0] ?? '';
  const lastChar = last[0] ?? '';
  return `${firstChar}${lastChar}`.toUpperCase() || 'KH';
}

function formatUtcDate(utc: string | null | undefined): string {
  if (!utc) return '—';
  try {
    return formatLocalDate(vietnamDateOf(utc));
  } catch {
    return formatLocalDate(utc);
  }
}

function isExpired(row: TreatmentPlanListItemDto): boolean {
  if (row.packageStatus === 'expired') return true;
  if (!row.expiresAtUtc) return false;
  try {
    return new Date(row.expiresAtUtc).getTime() < Date.now();
  } catch {
    return false;
  }
}

export interface TreatmentTableProps {
  data: readonly TreatmentPlanListItemDto[] | undefined;
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
  onSelectTreatment: (treatment: TreatmentPlanListItemDto) => void;
  onEditTreatment: (treatment: TreatmentPlanListItemDto) => void;
  onAssignStaff: (treatment: TreatmentPlanListItemDto) => void;
  onChangeStatus: (treatment: TreatmentPlanListItemDto) => void;
}

export function TreatmentTable({
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
  onSelectTreatment,
  onEditTreatment,
  onAssignStaff,
  onChangeStatus,
}: TreatmentTableProps) {
  const columns = useMemo<readonly DataTableColumn<TreatmentPlanListItemDto>[]>(
    () => [
      {
        id: 'customer',
        header: 'Khách hàng',
        cell: (row) => {
          const initials = getInitials(row.customer.fullName);
          return (
            <div className="flex items-center gap-3">
              <Avatar className="size-9 border">
                <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-foreground">
                  {row.customer.fullName}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {row.customer.phoneNumber || 'Chưa có SĐT'}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: 'package',
        header: 'Gói dịch vụ',
        cell: (row) => {
          const pkgBadge = packageStatusBadge(row.packageStatus);
          return (
            <div className="flex min-w-0 flex-col gap-1">
              <span className="line-clamp-2 text-sm font-medium text-foreground">
                {row.packageName}
              </span>
              {row.packageStatus !== 'active' && (
                <div>
                  <StatusBadge
                    label={pkgBadge.label}
                    tone={pkgBadge.tone}
                    status={row.packageStatus}
                  />
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: 'progress',
        header: 'Tiến độ',
        cell: (row) => {
          const percent =
            row.totalSessions > 0
              ? Math.min(100, Math.round((row.usedSessions / row.totalSessions) * 100))
              : 0;

          return (
            <div className="w-36 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">
                  {row.usedSessions}/{row.totalSessions} buổi
                </span>
                <span className="text-muted-foreground">{percent}%</span>
              </div>
              <div
                role="progressbar"
                aria-label={`Tiến độ ${row.usedSessions}/${row.totalSessions} buổi`}
                aria-valuemin={0}
                aria-valuemax={row.totalSessions}
                aria-valuenow={row.usedSessions}
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
              {row.bookedSessions > 0 && (
                <div className="text-[11px] text-muted-foreground">
                  {row.bookedSessions} buổi đã đặt lịch
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: 'nextSession',
        header: 'Buổi tiếp theo',
        hideBelow: 'md',
        cell: (row) => {
          if (!row.nextSession) {
            return (
              <span className="text-xs text-muted-foreground">
                {row.status === 'completed' ? 'Đã hoàn thành' : '—'}
              </span>
            );
          }
          const next = row.nextSession;
          const sessionBadge = treatmentSessionStatusBadge(next.status);

          return (
            <div className="flex min-w-0 flex-col gap-1 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <span className="text-primary">B{next.sequenceNumber}:</span>
                <span className="truncate">{next.serviceName}</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge
                  label={sessionBadge.label}
                  tone={sessionBadge.tone}
                  status={next.status}
                />
                {next.appointment && (
                  <span className="text-[11px] text-muted-foreground">
                    {formatLocalDate(next.appointment.date)} {next.appointment.startTime}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        id: 'primaryStaff',
        header: 'Kỹ thuật viên phụ trách',
        hideBelow: 'lg',
        cell: (row) => (
          <span className="text-xs text-foreground">
            {row.primaryStaff?.fullName ?? (
              <span className="text-muted-foreground italic">Chưa phân công</span>
            )}
          </span>
        ),
      },
      {
        id: 'expiresAt',
        header: 'Hạn sử dụng',
        hideBelow: 'lg',
        cell: (row) => {
          const expired = isExpired(row);
          return (
            <div className="flex flex-col gap-1 text-xs">
              <span className="text-foreground">{formatUtcDate(row.expiresAtUtc)}</span>
              {expired && (
                <div>
                  <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                    Đã hết hạn
                  </Badge>
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: (row) => {
          const badge = treatmentPlanStatusBadge(row.status);
          return <StatusBadge label={badge.label} tone={badge.tone} status={row.status} />;
        },
      },
    ],
    [],
  );

  const rowActions = (
    row: TreatmentPlanListItemDto,
  ): readonly DataTableRowAction<TreatmentPlanListItemDto>[] => {
    const actions: DataTableRowAction<TreatmentPlanListItemDto>[] = [
      {
        label: 'Xem chi tiết',
        icon: EyeIcon,
        onSelect: () => onSelectTreatment(row),
      },
    ];

    const isTerminal = row.status === 'completed' || row.status === 'cancelled';

    if (!isTerminal) {
      actions.push(
        {
          label: 'Cập nhật phác đồ',
          icon: PencilIcon,
          onSelect: () => onEditTreatment(row),
        },
        {
          label: 'Đổi nhân viên phụ trách',
          icon: UserCheckIcon,
          onSelect: () => onAssignStaff(row),
        },
      );
    }

    actions.push({
      label: 'Chuyển trạng thái',
      icon: PowerIcon,
      onSelect: () => onChangeStatus(row),
    });

    return actions;
  };

  const empty = (
    <EmptyState
      title={hasFilters ? 'Không tìm thấy liệu trình' : 'Chưa có liệu trình nào'}
      description={
        hasFilters
          ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
          : 'Khách hàng chưa có liệu trình điều trị nào trong hệ thống.'
      }
      action={
        hasFilters ? (
          <Button variant="outline" size="sm" onClick={onResetFilters}>
            Đặt lại bộ lọc
          </Button>
        ) : undefined
      }
    />
  );

  return (
    <DataTable<TreatmentPlanListItemDto>
      caption="Danh sách phác đồ điều trị của khách hàng"
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      isLoading={isLoading}
      isFetching={isFetching}
      error={error}
      onRetry={onRetry}
      page={page}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      pageSizeOptions={pageSizeOptions}
      rowActions={rowActions}
      onRowClick={onSelectTreatment}
      empty={empty}
    />
  );
}
