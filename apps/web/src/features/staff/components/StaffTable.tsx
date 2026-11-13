import { useMemo } from 'react';
import { EyeIcon, PencilIcon, SparklesIcon, UserMinusIcon } from 'lucide-react';
import type { StaffListItem } from '@spa/shared-types';
import {
  DataTable,
  type DataTableColumn,
  type DataTablePage,
  type DataTableRowAction,
} from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatLocalDate } from '@/lib/formatting/formatters';
import { staffAccountBadge, staffWorkingBadge } from '../staffStatus';

export interface StaffTableProps {
  data: readonly StaffListItem[] | undefined;
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
  onSelectStaff: (staff: StaffListItem) => void;
  onEditStaff: (staff: StaffListItem) => void;
  onUpdateServices: (staff: StaffListItem) => void;
  onResignStaff: (staff: StaffListItem) => void;
}

export function StaffTable({
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
  onSelectStaff,
  onEditStaff,
  onUpdateServices,
  onResignStaff,
}: StaffTableProps) {
  const columns = useMemo<readonly DataTableColumn<StaffListItem>[]>(
    () => [
      {
        id: 'name',
        header: 'Nhân viên',
        cell: (row) => {
          const initials = row.fullName
            .split(' ')
            .map((w) => w[0])
            .filter(Boolean)
            .slice(-2)
            .join('')
            .toUpperCase();

          return (
            <div className="flex items-center gap-3">
              <Avatar className="size-9 border">
                <AvatarImage src={row.avatarUrl ?? undefined} alt={row.fullName} />
                <AvatarFallback className="text-xs font-medium">{initials || 'NV'}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate font-medium text-foreground">{row.fullName}</span>
                  {row.pendingCertificationCount > 0 && (
                    <StatusBadge
                      label={`${row.pendingCertificationCount} chờ duyệt`}
                      tone="warning"
                    />
                  )}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {row.specialty || 'Chuyên viên trị liệu'}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: 'contact',
        header: 'Liên hệ',
        cell: (row) => (
          <div className="flex flex-col text-xs">
            <span className="text-foreground">{row.phoneNumber}</span>
            <span className="truncate text-muted-foreground">{row.email}</span>
          </div>
        ),
      },
      {
        id: 'hireDate',
        header: 'Ngày vào làm',
        hideBelow: 'md',
        cell: (row) => (
          <div className="flex flex-col text-xs">
            <span>{formatLocalDate(row.hireDate)}</span>
            {row.resignationDate && (
              <span className="text-muted-foreground">
                Nghỉ: {formatLocalDate(row.resignationDate)}
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'workingStatus',
        header: 'Trạng thái',
        cell: (row) => {
          const isResigned = Boolean(row.resignationDate);
          const badge = staffWorkingBadge(isResigned);
          return (
            <StatusBadge
              label={badge.label}
              tone={badge.tone}
              status={isResigned ? 'resigned' : 'working'}
            />
          );
        },
      },
      {
        id: 'accountStatus',
        header: 'Tài khoản',
        hideBelow: 'sm',
        cell: (row) => {
          const badge = staffAccountBadge(row.accountStatus);
          return <StatusBadge label={badge.label} tone={badge.tone} status={row.accountStatus} />;
        },
      },
    ],
    [],
  );

  const rowActions = (row: StaffListItem): DataTableRowAction<StaffListItem>[] => {
    const isResigned = Boolean(row.resignationDate);
    const actions: DataTableRowAction<StaffListItem>[] = [
      {
        label: 'Xem chi tiết',
        icon: EyeIcon,
        onSelect: () => onSelectStaff(row),
      },
    ];

    if (!isResigned) {
      actions.push(
        {
          label: 'Sửa thông tin',
          icon: PencilIcon,
          onSelect: () => onEditStaff(row),
        },
        {
          label: 'Gán dịch vụ',
          icon: SparklesIcon,
          onSelect: () => onUpdateServices(row),
        },
        {
          label: 'Ghi nhận nghỉ việc',
          icon: UserMinusIcon,
          variant: 'destructive',
          onSelect: () => onResignStaff(row),
        },
      );
    }

    return actions;
  };

  const empty = (
    <EmptyState
      title={hasFilters ? 'Không tìm thấy nhân viên' : 'Chưa có nhân viên nào'}
      description={
        hasFilters
          ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
          : 'Hãy thêm nhân viên đầu tiên vào hệ thống spa.'
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
    <DataTable<StaffListItem>
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      caption="Danh sách nhân viên"
      page={page}
      isLoading={isLoading}
      isFetching={isFetching}
      error={error}
      onRetry={onRetry}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      pageSizeOptions={pageSizeOptions}
      onRowClick={(row) => onSelectStaff(row)}
      rowActions={rowActions}
      empty={empty}
    />
  );
}
