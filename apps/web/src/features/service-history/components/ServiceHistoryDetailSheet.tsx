import {
  AlertCircleIcon,
  CalendarDaysIcon,
  ExternalLinkIcon,
  FileTextIcon,
  PackageIcon,
  ReceiptIcon,
  UserRoundIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { formatLocalDate } from '@/lib/formatting/formatters';
import { serviceHistoryStatusBadge } from '../historyStatus';
import { useServiceHistoryDetail } from '../hooks/useServiceHistoryDetail';

export function ServiceHistoryDetailSheet({
  appointmentId,
  open,
  onOpenChange,
  onViewOrder,
}: {
  appointmentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewOrder?: (order: { id: string; code: string }) => void;
}) {
  const { data, isLoading } = useServiceHistoryDetail(appointmentId ?? '', open);
  if (!appointmentId) return null;

  const badge = data ? serviceHistoryStatusBadge(data.status) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="space-y-1 border-b pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Chi tiết lần sử dụng
            </span>
            {badge && <StatusBadge label={badge.label} tone={badge.tone} status={data?.status} />}
          </div>
          <SheetTitle className="font-heading text-xl font-bold text-foreground">
            {isLoading ? <Skeleton className="h-6 w-48" /> : data?.serviceName}
          </SheetTitle>
          {data && (
            <SheetDescription className="text-xs text-muted-foreground">
              {`Thời lượng: ${data.durationMinutes} phút`}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="space-y-6 py-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ) : data ? (
            <>
              {/* Date & staff */}
              <div className="space-y-2.5 rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <CalendarDaysIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{`${formatLocalDate(data.date)} lúc ${data.startTime} – ${data.endTime}`}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <UserRoundIcon className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                  <span>{`Kỹ thuật viên: ${data.staff.fullName}`}</span>
                </div>
              </div>

              {/* Source information */}
              <div className="space-y-2 rounded-xl border bg-card p-4">
                <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Nguồn dịch vụ
                </h4>
                {data.source === 'package' ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <PackageIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span>{`Gói: ${data.packageName}`}</span>
                    </div>
                    {data.sequenceNumber !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        {`Buổi thứ ${data.sequenceNumber} trong phác đồ`}
                      </p>
                    )}
                    {data.treatmentPlanId && (
                      <Button asChild variant="outline" size="sm" className="mt-1 text-xs">
                        <Link to={`/my-treatment-plans/${data.treatmentPlanId}`}>
                          Xem phác đồ liệu trình
                          <ExternalLinkIcon className="ml-1.5 size-3" aria-hidden="true" />
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Dịch vụ lẻ</p>
                    {data.order && (
                      <div className="flex items-center gap-2">
                        <ReceiptIcon
                          className="size-3.5 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        <button
                          type="button"
                          onClick={() => onViewOrder?.(data.order!)}
                          className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                        >
                          {`Đơn hàng #${data.order.code}`}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Care result / No-show alert */}
              {data.status === 'no_show' ? (
                <Alert
                  variant="destructive"
                  className="border-destructive/30 bg-destructive/10 text-destructive"
                >
                  <AlertCircleIcon className="size-4 text-destructive" aria-hidden="true" />
                  <AlertTitle className="font-semibold">Buổi hẹn vắng mặt</AlertTitle>
                  <AlertDescription className="mt-1 text-xs text-muted-foreground">
                    Khách hàng không đến theo lịch hẹn đã đặt. Không có kết quả chăm sóc được ghi
                    nhận.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <FileTextIcon className="size-4 text-primary" aria-hidden="true" />
                    Kết quả chăm sóc da
                  </h4>
                  {data.result ? (
                    <div className="rounded-xl border border-secondary bg-secondary/20 p-4 text-sm leading-relaxed whitespace-pre-line text-foreground">
                      {data.result}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                      Kỹ thuật viên chưa ghi chú kết quả cho lần chăm sóc này.
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
