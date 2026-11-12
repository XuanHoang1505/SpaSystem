import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ownerUsersQueryKeys } from '@spa/api-client';
import type { UserDetail, UserFilterParams, UserListItem, UserRole } from '@spa/shared-types';
import { useTableSearchParams } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import { OrdersBreadcrumb } from '@/features/orders';
import { useAuthStore } from '@/stores/authStore';
import { useFetchOwnerUser, useOwnerUsers } from '../../hooks/useOwnerUsers';
import { isUserStatus } from '../../userStatus';
import { ChangeUserStatusDialog, type StatusTarget } from './ChangeUserStatusDialog';
import { EditUserDialog } from './EditUserDialog';
import { UserDetailSheet } from './UserDetailSheet';
import { UserFilterToolbar } from './UserFilterToolbar';
import { UserTable, type UserAction } from './UserTable';

const trail = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Quản trị spa', to: '/owner' },
  { label: 'Tài khoản người dùng' },
];

const roles: readonly UserRole[] = ['customer', 'staff', 'owner'];
const toRole = (value: string) => roles.find((role) => role === value);

/** SCR-W40 (UC-SPA-05): the owner searches, reads, edits and locks/unlocks accounts. */
export function OwnerUsersView() {
  const table = useTableSearchParams({ defaultPageSize: 10 });
  const { pageNumber, pageSize, search, getFilter, setFilter, setPage } = table;
  const role = toRole(getFilter('role'));
  const rawStatus = getFilter('status');
  const status = isUserStatus(rawStatus) ? rawStatus : undefined;
  const currentUserId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  const fetchUser = useFetchOwnerUser();

  const params = useMemo<UserFilterParams>(
    () => ({ pageNumber, pageSize, search: search || undefined, role, status }),
    [pageNumber, pageSize, search, role, status],
  );
  const users = useOwnerUsers(params);
  const data = users.data;

  useEffect(() => {
    if (data && !users.isPlaceholderData && data.totalPages > 0 && pageNumber > data.totalPages)
      setPage(data.totalPages, { replace: true });
  }, [data, users.isPlaceholderData, pageNumber, setPage]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<UserDetail | null>(null);
  const [statusTarget, setStatusTarget] = useState<StatusTarget | null>(null);

  const openEdit = async (user: UserListItem) => {
    try {
      setEditing(await fetchUser(user.id));
    } catch {
      // The Sheet shows why the detail could not be loaded (not found, network) with a retry.
      setSelectedId(user.id);
    }
  };

  const onAction = (action: UserAction, user: UserListItem) => {
    if (action === 'view') setSelectedId(user.id);
    else if (action === 'edit') void openEdit(user);
    else setStatusTarget({ id: user.id, fullName: user.fullName, action });
  };

  const closeAfterNotFound = () => {
    setSelectedId(null);
    void queryClient.invalidateQueries({ queryKey: ownerUsersQueryKeys.all });
  };

  return (
    <section className="space-y-6 rounded-2xl border bg-card p-5 shadow-xs sm:p-6 lg:p-8">
      <OrdersBreadcrumb trail={trail} />
      <PageHeader
        title="Tài khoản người dùng"
        description="Tìm, xem và cập nhật tài khoản khách hàng, nhân viên, chủ spa. Khóa tài khoản sẽ đăng xuất người đó khỏi mọi thiết bị."
        className="border-b pb-4"
      />
      <div className="space-y-4">
        <UserFilterToolbar
          search={search}
          onSearchChange={table.setSearch}
          role={role ?? ''}
          onRoleChange={(value) => setFilter('role', value || null)}
          status={status ?? ''}
          onStatusChange={(value) => setFilter('status', value || null)}
          hasFilters={table.hasFilters}
          onReset={table.resetFilters}
        />
        <UserTable
          data={data?.items}
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
          isLoading={users.isLoading}
          isFetching={users.isFetching}
          error={users.isError ? 'Không tải được danh sách tài khoản.' : null}
          onRetry={() => void users.refetch()}
          onPageChange={setPage}
          onPageSizeChange={table.setPageSize}
          hasFilters={table.hasFilters}
          onResetFilters={table.resetFilters}
          currentUserId={currentUserId}
          onAction={onAction}
        />
      </div>

      <UserDetailSheet
        userId={selectedId}
        currentUserId={currentUserId}
        onClose={() => setSelectedId(null)}
        onEdit={setEditing}
        onChangeStatus={(user, action) =>
          setStatusTarget({ id: user.id, fullName: user.fullName, action })
        }
      />
      <EditUserDialog
        user={editing}
        onClose={() => setEditing(null)}
        onNotFound={closeAfterNotFound}
      />
      <ChangeUserStatusDialog
        target={statusTarget}
        onClose={() => setStatusTarget(null)}
        onNotFound={closeAfterNotFound}
      />
    </section>
  );
}
