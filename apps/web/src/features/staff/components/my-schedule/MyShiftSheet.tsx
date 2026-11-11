import { ChevronRightIcon, ClockIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { errorCodeOf, workScheduleErrorCodes } from '@spa/api-client';
import { ErrorState } from '@/components/shared/ErrorState/ErrorState';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { appointmentStatusBadge } from '@/features/bookings/appointmentStatus';
import { formatLocalTime } from '@/lib/formatting/formatters';
import { formatLongDate } from '@/lib/formatting/vietnamTime';
import { useMyWorkSchedule } from '../../hooks/useMySchedule';
import { workScheduleStatusBadge } from '../../staffStatus';

/** UC-SPA-24 step 3: one shift and the staff member's appointments inside it, each opening its care page. */
export function MyShiftSheet({
  shiftId,
  onClose,
}: {
  shiftId: string | null;
  onClose: () => void;
}) {
  const query = useMyWorkSchedule(shiftId);
  const shift = query.data;
  const notFound = errorCodeOf(query.error) === workScheduleErrorCodes.WORK_SCHEDULE_NOT_FOUND;

  return (
    <Sheet open={shiftId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b p-5">
          <SheetTitle>{shift ? `Ca ${formatLongDate(shift.date)}` : 'Chi tiết ca làm'}</SheetTitle>
          <SheetDescription>Lịch hẹn của bạn trong ca này</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {query.isLoading && (
            <div className="space-y-3" aria-label="Đang tải ca làm">
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {query.isError && (
            <ErrorState
              title={notFound ? 'Không tìm thấy ca làm' : 'Không tải được ca làm'}
              onRetry={notFound ? undefined : () => void query.refetch()}
              retrying={query.isFetching}
            />
          )}

          {shift && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 font-heading text-lg font-semibold">
                  <ClockIcon className="size-4" aria-hidden="true" />
                  {`${formatLocalTime(shift.startTime)} – ${formatLocalTime(shift.endTime)}`}
                </span>
                <StatusBadge {...workScheduleStatusBadge(shift.status)} />
              </div>

              {shift.appointments.length === 0 ? (
                <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Chưa có lịch hẹn trong ca này.
                </p>
              ) : (
                <ul className="grid gap-2">
                  {shift.appointments.map((appointment) => {
                    const badge = appointmentStatusBadge(appointment.status);
                    const session = appointment.treatmentSession;
                    return (
                      <li key={appointment.id}>
                        <Link
                          to={`/staff/bookings/${encodeURIComponent(appointment.id)}`}
                          className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <span className="w-12 shrink-0 text-sm font-semibold">
                            {formatLocalTime(appointment.startTime)}
                          </span>
                          <span className="min-w-0 flex-1 space-y-0.5">
                            <span className="block truncate font-medium">
                              {appointment.customer.fullName}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {session
                                ? `${appointment.service.name} · Buổi ${session.sequenceNumber}/${session.totalSessions}`
                                : appointment.service.name}
                            </span>
                          </span>
                          <StatusBadge label={badge.label} tone={badge.tone} />
                          <ChevronRightIcon
                            className="size-4 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
