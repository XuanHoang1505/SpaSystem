import type { ReactNode } from 'react';
import { InfoIcon, LockIcon, LockOpenIcon, PencilIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { errorCodeOf, usersErrorCodes } from '@spa/api-client';
import type { UserDetail } from '@spa/shared-types';
import { ErrorState } from '@/components/shared/ErrorState/ErrorState';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { roleLabels } from '@/features/auth/navigation';
import { formatDateTimeUtc, formatLocalDate } from '@/lib/formatting/formatters';
import { useOwnerUser } from '../../hooks/useOwnerUsers';
import { genderLabels, userStatusBadge } from '../../userStatus';
import { statusActionFor } from './UserTable';
import { UserAvatar } from './UserAvatar';

const NOT_SET = 'Chưa cập nhật';

/** SCR-W40 detail: every field of one account, with edit and lock/unlock in the footer. */
export function UserDetailSheet({
  userId,
  currentUserId,
  onClose,
  onEdit,
  onChangeStatus,
}: {
  userId: string | null;
  currentUserId: string | undefined;
  onClose: () => void;
  onEdit: (user: UserDetail) => void;
  onChangeStatus: (user: UserDetail, action: 'lock' | 'unlock') => void;
}) {
  const query = useOwnerUser(userId);
  const user = query.data;
  const statusAction = user ? statusActionFor(user, currentUserId) : null;
  const notFound = errorCodeOf(query.error) === usersErrorCodes.userNotFound;

  return (
    <Sheet open={userId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b p-5">
          <SheetTitle>Chi tiết tài khoản</SheetTitle>
          <SheetDescription>Thông tin cá nhân, vai trò và trạng thái</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {query.isLoading && (
            <div className="space-y-4" aria-label="Đang tải tài khoản">
              <div className="flex items-center gap-3">
                <Skeleton className="size-14 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-40 w-full" />
            </div>
          )}

          {query.isError && (
            <ErrorState
              title={notFound ? 'Không tìm thấy tài khoản' : 'Không tải được tài khoản'}
              onRetry={notFound ? undefined : () => void query.refetch()}
              retrying={query.isFetching}
            />
          )}

          {user && (
            <>
              <div className="flex items-center gap-4">
                <UserAvatar
                  fullName={user.fullName}
                  avatarUrl={user.avatarUrl}
                  className="size-14 text-base"
                />
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-heading text-lg font-semibold">{user.fullName}</p>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{roleLabels[user.role]}</span>
                    <StatusBadge {...userStatusBadge(user.status)} />
                  </div>
                </div>
              </div>

              {user.status === 'inactive' && user.staff?.resignationDate && (
                <Alert>
                  <InfoIcon className="size-4" aria-hidden="true" />
                  <AlertDescription>
                    <span>
                      {`Nhân viên đã nghỉ việc từ ${formatLocalDate(user.staff.resignationDate)}. Trạng thái này quản lý ở `}
                      <Link to="/owner/staff" className="font-medium text-primary hover:underline">
                        Trang Nhân viên
                      </Link>
                      .
                    </span>
                  </AlertDescription>
                </Alert>
              )}

              <dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-[9rem_minmax(0,1fr)]">
                <Row label="Email">{user.email}</Row>
                <Row label="Số điện thoại">
                  <a href={`tel:${user.phoneNumber}`} className="text-primary hover:underline">
                    {user.phoneNumber}
                  </a>
                </Row>
                <Row label="Ngày sinh">
                  {user.dateOfBirth ? formatLocalDate(user.dateOfBirth) : NOT_SET}
                </Row>
                <Row label="Giới tính">{user.gender ? genderLabels[user.gender] : NOT_SET}</Row>
                {user.staff && (
                  <>
                    <Row label="Ngày vào làm">{formatLocalDate(user.staff.hireDate)}</Row>
                    {user.staff.resignationDate && (
                      <Row label="Ngày nghỉ việc">
                        {formatLocalDate(user.staff.resignationDate)}
                      </Row>
                    )}
                  </>
                )}
                <Row label="Ngày tạo">{formatDateTimeUtc(user.createdAtUtc)}</Row>
                <Row label="Cập nhật lần cuối">
                  {user.updatedAtUtc ? formatDateTimeUtc(user.updatedAtUtc) : NOT_SET}
                </Row>
              </dl>
            </>
          )}
        </div>

        {user && (
          <SheetFooter className="flex-row flex-wrap justify-end gap-2 border-t p-4">
            <Button type="button" variant="outline" onClick={() => onEdit(user)}>
              <PencilIcon aria-hidden="true" />
              Sửa thông tin
            </Button>
            {statusAction === 'lock' && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => onChangeStatus(user, 'lock')}
              >
                <LockIcon aria-hidden="true" />
                Khóa tài khoản
              </Button>
            )}
            {statusAction === 'unlock' && (
              <Button type="button" onClick={() => onChangeStatus(user, 'unlock')}>
                <LockOpenIcon aria-hidden="true" />
                Mở khóa
              </Button>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="contents">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words text-foreground">{children}</dd>
    </div>
  );
}
