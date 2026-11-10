import {
  CalendarIcon,
  MailIcon,
  PencilIcon,
  PhoneIcon,
  SparklesIcon,
  UserMinusIcon,
} from 'lucide-react';
import type { StaffDetail } from '@spa/shared-types';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState/ErrorState';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTimeUtc, formatLocalDate } from '@/lib/formatting/formatters';
import { useStaffDetail } from '../hooks/useStaffDetail';
import { staffAccountBadge, staffWorkingBadge } from '../staffStatus';

export interface StaffDetailSheetProps {
  staffId: string | null;
  onClose: () => void;
  onEdit: (staff: StaffDetail) => void;
  onUpdateServices: (staff: StaffDetail) => void;
  onResign: (staff: StaffDetail) => void;
}

export function StaffDetailSheet({
  staffId,
  onClose,
  onEdit,
  onUpdateServices,
  onResign,
}: StaffDetailSheetProps) {
  const query = useStaffDetail(staffId);
  const detail = query.data;

  const initials = detail?.fullName
    ? detail.fullName
        .split(' ')
        .map((w) => w[0])
        .filter(Boolean)
        .slice(-2)
        .join('')
        .toUpperCase()
    : 'NV';

  const isResigned = Boolean(detail?.resignationDate);

  return (
    <Sheet open={Boolean(staffId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b p-5">
          <SheetTitle>Chi tiết nhân viên</SheetTitle>
          <SheetDescription>Thông tin hồ sơ, liên hệ và dịch vụ phụ trách</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {query.isLoading && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-14 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}

          {query.isError && (
            <ErrorState
              title="Không tải được chi tiết"
              message="Đã xảy ra lỗi khi tải thông tin nhân viên."
              onRetry={() => query.refetch()}
            />
          )}

          {!query.isLoading && !query.isError && !detail && (
            <EmptyState
              title="Không tìm thấy nhân viên"
              description="Nhân viên này không tồn tại hoặc đã bị xóa."
            />
          )}

          {detail && (
            <>
              {/* Header Profile */}
              <div className="flex items-center gap-4">
                <Avatar className="size-14 border shadow-xs">
                  <AvatarImage src={detail.avatarUrl ?? undefined} alt={detail.fullName} />
                  <AvatarFallback className="text-base font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-heading text-lg font-bold text-foreground">
                    {detail.fullName}
                  </h3>
                  <p className="truncate text-sm text-muted-foreground">
                    {detail.specialty || 'Chuyên viên trị liệu'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusBadge
                      label={staffWorkingBadge(isResigned).label}
                      tone={staffWorkingBadge(isResigned).tone}
                      status={isResigned ? 'resigned' : 'working'}
                    />
                    <StatusBadge
                      label={staffAccountBadge(detail.accountStatus).label}
                      tone={staffAccountBadge(detail.accountStatus).tone}
                      status={detail.accountStatus}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Contact & Employment */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Thông tin công việc & liên hệ
                </h4>
                <div className="space-y-2.5 rounded-xl border bg-card/60 p-3.5 text-sm">
                  <div className="flex items-center gap-2.5">
                    <MailIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">Email:</span>
                    <span className="ml-auto truncate font-medium text-foreground">
                      {detail.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <PhoneIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">Số điện thoại:</span>
                    <span className="ml-auto font-medium text-foreground">
                      {detail.phoneNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">Ngày vào làm:</span>
                    <span className="ml-auto font-medium text-foreground">
                      {formatLocalDate(detail.hireDate)}
                    </span>
                  </div>
                  {detail.resignationDate && (
                    <div className="flex items-center gap-2.5 text-destructive">
                      <CalendarIcon className="size-4 shrink-0" />
                      <span>Ngày nghỉ việc:</span>
                      <span className="ml-auto font-medium">
                        {formatLocalDate(detail.resignationDate)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Assigned Services */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Dịch vụ phụ trách ({detail.services.length})
                  </h4>
                  {!isResigned && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onUpdateServices(detail)}
                      className="h-auto p-0 text-xs"
                    >
                      Thay đổi
                    </Button>
                  )}
                </div>
                {detail.services.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground italic">
                    Chưa gán dịch vụ nào cho nhân viên này.
                  </p>
                ) : (
                  <div className="divide-y rounded-xl border bg-card/60">
                    {detail.services.map((svc) => (
                      <div key={svc.id} className="flex items-center justify-between p-3 text-sm">
                        <span className="font-medium text-foreground">{svc.name}</span>
                        <StatusBadge
                          label={svc.status === 'on_sale' ? 'Đang bán' : 'Ngừng bán'}
                          tone={svc.status === 'on_sale' ? 'success' : 'neutral'}
                          status={svc.status}
                          className="text-[11px]"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* System Info */}
              <div className="space-y-2 text-xs text-muted-foreground">
                <div>Tạo lúc: {formatDateTimeUtc(detail.createdAtUtc)}</div>
                {detail.updatedAtUtc && (
                  <div>Cập nhật: {formatDateTimeUtc(detail.updatedAtUtc)}</div>
                )}
              </div>
            </>
          )}
        </div>

        {detail && !isResigned && (
          <SheetFooter className="flex flex-row flex-wrap justify-end gap-2 border-t p-4 sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => onEdit(detail)} className="gap-1.5">
              <PencilIcon className="size-3.5" />
              Sửa thông tin
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateServices(detail)}
              className="gap-1.5"
            >
              <SparklesIcon className="size-3.5" />
              Gán dịch vụ
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onResign(detail)}
              className="gap-1.5"
            >
              <UserMinusIcon className="size-3.5" />
              Nghỉ việc
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
