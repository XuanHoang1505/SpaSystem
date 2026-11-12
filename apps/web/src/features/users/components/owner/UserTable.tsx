import { useMemo } from 'react';
import { EyeIcon, LockIcon, LockOpenIcon, PencilIcon } from 'lucide-react';
import type { UserListItem } from '@spa/shared-types';
import {
  DataTable,
  type DataTableColumn,
  type DataTablePage,
  type DataTableRowAction,
} from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Button } from '@/components/ui/button';
import { roleLabels } from '@/features/auth/navigation';
import { vietnamDateOf } from '@/lib/formatting/vietnamTime';
import { formatLocalDate } from '@/lib/formatting/formatters';
import { userStatusBadge } from '../../userStatus';
import { UserAvatar } from './UserAvatar';

export type UserAction = 'view' | 'edit' | 'lock' | 'unlock';

/**
 * Lock/unlock follow the status the server returned; the signed-in owner's own row never offers "lock"
 * (the server answers `cannot_lock_self` anyway). Inactive (resigned staff) accounts are managed on the staff page.
 */
export function statusActionFor(
  user: Pick<UserListItem, 'id' | 'status'>,
  currentUserId: string | undefined,
): 'lock' | 'unlock' | null {
  if (user.status === 'locked') return 'unlock';
  if (user.status === 'active' && user.id !== currentUserId) return 'lock';
  return null;
}

export function UserTable({
  data,
  page,
  isLoading,
  isFetching,
  error,
  onRetry,
  onPageChange,
  onPageSizeChange,
  hasFilters,
  onResetFilters,
  currentUserId,
  onAction,
}: {
  data: readonly UserListItem[] | undefined;
  page?: DataTablePage;
  isLoading?: boolean;
  isFetching?: boolean;
  error?: string | null;
  onRetry: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  hasFilters: boolean;
  onResetFilters: () => void;
  currentUserId: string | undefined;
  onAction: (action: UserAction, user: UserListItem) => void;
}) {
  const columns = useMemo<readonly DataTableColumn<UserListItem>[]>(
    () => [
      {
        id: 'account',
        header: 'Tài khoản',
        cell: (row) => (
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar fullName={row.fullName} avatarUrl={row.avatarUrl} />
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium text-foreground">{row.fullName}</span>
              <span className="truncate text-xs text-muted-foreground">{row.email}</span>
            </div>
          </div>
        ),
      },
      { id: 'phone', header: 'SĐT', hideBelow: 'md', cell: (row) => row.phoneNumber },
      { id: 'role', header: 'Vai trò', hideBelow: 'sm', cell: (row) => roleLabels[row.role] },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: (row) => {
          const badge = userStatusBadge(row.status);
          return <StatusBadge label={badge.label} tone={badge.tone} status={row.status} />;
        },
      },
      {
        id: 'createdAt',
        header: 'Ngày tạo',
        hideBelow: 'lg',
        className: 'whitespace-nowrap',
        cell: (row) => formatLocalDate(vietnamDateOf(row.createdAtUtc)),
      },
    ],
    [],
  );

  const rowActions = (row: UserListItem): DataTableRowAction<UserListItem>[] => {
    const statusAction = statusActionFor(row, currentUserId);
    return [
      { label: 'Xem chi tiết', icon: EyeIcon, onSelect: () => onAction('view', row) },
      { label: 'Sửa thông tin', icon: PencilIcon, onSelect: () => onAction('edit', row) },
      ...(statusAction === 'lock'
        ? [
            {
              label: 'Khóa tài khoản',
              icon: LockIcon,
              variant: 'destructive' as const,
              onSelect: () => onAction('lock', row),
            },
          ]
        : statusAction === 'unlock'
          ? [{ label: 'Mở khóa', icon: LockOpenIcon, onSelect: () => onAction('unlock', row) }]
          : []),
    ];
  };

  const empty = hasFilters ? (
    <EmptyState
      title="Không có tài khoản nào khớp bộ lọc"
      action={
        <Button variant="outline" onClick={onResetFilters}>
          Xóa bộ lọc
        </Button>
      }
    />
  ) : (
    <EmptyState title="Chưa có tài khoản nào" />
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      getRowId={(row) => row.id}
      caption="Danh sách tài khoản"
      isLoading={isLoading}
      isFetching={isFetching}
      error={error}
      onRetry={onRetry}
      empty={empty}
      page={page}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      onRowClick={(row) => onAction('view', row)}
      rowActions={rowActions}
    />
  );
}
