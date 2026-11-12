import { AlertCircleIcon, UserIcon, UserRoundIcon } from 'lucide-react';
import type { AppointmentDetail } from '@spa/shared-types';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState/ErrorState';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { formatDateTimeUtc, formatTimeUtc } from '@/lib/formatting/formatters';
import { durationMinutes, formatLongDate } from '@/lib/formatting/vietnamTime';
import {
  allergySeverityBadge,
  appointmentStatusBadge,
  ownerActionIcons,
  ownerActionLabels,
  ownerAppointmentActions,
  type OwnerAppointmentAction,
} from '../../appointmentStatus';
import { useOwnerAppointment } from '../../hooks/owner/useOwnerAppointment';

export interface OwnerAppointmentSheetProps {
  appointmentId: string | null;
  onClose: () => void;
  onAction: (action: OwnerAppointmentAction, appointment: AppointmentDetail) => void;
}

export function OwnerAppointmentSheet({
  appointmentId,
  onClose,
  onAction,
}: OwnerAppointmentSheetProps) {
  const query = useOwnerAppointment(appointmentId);
  const detail = query.data;

  const is404 =
    query.isError &&
    typeof query.error === 'object' &&
    query.error !== null &&
    'status' in query.error &&
    query.error.status === 404;

  return (
    <Sheet open={appointmentId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto bg-card p-6 shadow-xl sm:max-w-md">
        {query.isLoading ? (
          <div data-testid="appointment-sheet-skeleton" className="space-y-4 pt-6">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Separator className="my-4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : is404 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <EmptyState
              title="Không tìm thấy lịch hẹn"
              action={
                <Button variant="outline" onClick={onClose}>
                  Đóng
                </Button>
              }
            />
          </div>
        ) : query.isError ? (
          <div className="py-12">
            <ErrorState
              title="Không tải được chi tiết lịch hẹn"
              onRetry={() => void query.refetch()}
              retrying={query.isFetching}
            />
          </div>
        ) : detail ? (
          <div className="flex flex-col gap-5 pt-1">
            <SheetHeader className="p-0 pr-8 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="text-xl font-semibold text-foreground">
                  {detail.service.name}
                </SheetTitle>
                {(() => {
                  const badge = appointmentStatusBadge(detail.status);
                  return (
                    <StatusBadge label={badge.label} tone={badge.tone} status={detail.status} />
                  );
                })()}
              </div>
              <SheetDescription className="text-xs text-muted-foreground">
                {`${formatLongDate(detail.date)} · ${detail.startTime} – ${detail.endTime} (${durationMinutes(detail.startTime, detail.endTime)} phút)`}
              </SheetDescription>
            </SheetHeader>

            {/* Allergies */}
            {detail.allergies.length > 0 && (
              <Alert
                variant="destructive"
                className="border-status-warning bg-status-warning/10 text-status-warning-foreground"
              >
                <AlertCircleIcon className="size-4 text-status-warning" />
                <AlertTitle className="font-semibold text-foreground">
                  Khách có ghi nhận dị ứng
                </AlertTitle>
                <AlertDescription className="mt-1 space-y-1.5 text-foreground">
                  {detail.allergies.map((allergy) => {
                    const badge = allergySeverityBadge(allergy.severity);
                    return (
                      <div key={allergy.id} className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-medium">{allergy.allergen}</span>
                        <StatusBadge label={badge.label} tone={badge.tone} />
                        {allergy.note && (
                          <span className="text-muted-foreground">({allergy.note})</span>
                        )}
                      </div>
                    );
                  })}
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            {/* Customer & Staff */}
            <div className="grid gap-4 text-sm">
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <UserIcon className="size-3.5" />
                  Khách hàng
                </p>
                <p className="font-medium text-foreground">{detail.customer.fullName}</p>
                <p>
                  <a
                    href={`tel:${detail.customer.phoneNumber}`}
                    className="text-primary hover:underline"
                  >
                    {detail.customer.phoneNumber}
                  </a>
                </p>
              </div>

              <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <UserRoundIcon className="size-3.5" />
                  Nhân viên thực hiện
                </p>
                <p className="font-medium text-foreground">{detail.staff.fullName}</p>
              </div>

              {detail.treatmentSession && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Nguồn
                  </p>
                  <p className="text-foreground">
                    {`Buổi ${detail.treatmentSession.sequenceNumber}/${detail.treatmentSession.totalSessions} · ${detail.treatmentSession.packageName}`}
                  </p>
                </div>
              )}

              {detail.note && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Ghi chú
                  </p>
                  <p className="rounded-lg bg-muted/40 p-2 text-foreground">{detail.note}</p>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Hồ sơ da
                </p>
                <p className="text-foreground">{detail.hasSkinProfile ? 'Đã lập' : 'Chưa lập'}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Tạo lúc
                </p>
                <p className="text-muted-foreground">{formatDateTimeUtc(detail.createdAtUtc)}</p>
              </div>

              {detail.status === 'held' && detail.holdExpiresAtUtc && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                  <p className="font-semibold">
                    {`Giữ chỗ đến ${formatTimeUtc(detail.holdExpiresAtUtc)}`}
                  </p>
                  <p className="mt-0.5">Đang chờ khách thanh toán, chưa thể điều chỉnh</p>
                </div>
              )}

              {detail.status === 'cancelled' && (
                <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                  {detail.cancelledAtUtc && (
                    <p>Đã hủy lúc: {formatDateTimeUtc(detail.cancelledAtUtc)}</p>
                  )}
                  {detail.cancellationReason && (
                    <p className="mt-1 font-medium text-foreground">
                      Lý do: {detail.cancellationReason}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            {(() => {
              const actions = ownerAppointmentActions(detail.status);
              if (actions.length === 0) return null;
              return (
                <SheetFooter className="mt-4 flex flex-col gap-2 p-0 sm:flex-col">
                  {actions.map((action) => {
                    const Icon = ownerActionIcons[action];
                    return (
                      <Button
                        key={action}
                        variant={
                          action === 'confirm'
                            ? 'default'
                            : action === 'cancel'
                              ? 'outline'
                              : 'outline'
                        }
                        className={
                          action === 'cancel'
                            ? 'gap-2 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive'
                            : 'gap-2'
                        }
                        onClick={() => onAction(action, detail)}
                      >
                        {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
                        {ownerActionLabels[action]}
                      </Button>
                    );
                  })}
                </SheetFooter>
              );
            })()}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
