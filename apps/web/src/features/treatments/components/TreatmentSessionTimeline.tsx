import {
  CalendarDaysIcon,
  CalendarPlusIcon,
  CheckCircle2Icon,
  ClockIcon,
  ExternalLinkIcon,
  FileTextIcon,
  MinusCircleIcon,
  UserRoundIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MyTreatmentSession } from '@spa/shared-types';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Button } from '@/components/ui/button';
import { formatLocalDate } from '@/lib/formatting/formatters';
import { treatmentSessionStatusBadge } from '../treatmentStatus';

export function TreatmentSessionTimeline({
  planId,
  sessions,
  onViewSessionResult,
}: {
  planId: string;
  sessions: readonly MyTreatmentSession[];
  onViewSessionResult: (session: MyTreatmentSession) => void;
}) {
  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-xs sm:p-6">
      <div className="border-b pb-4">
        <h3 className="font-heading text-lg font-bold tracking-tight text-foreground sm:text-xl">
          {`Nhật ký phác đồ (${sessions.length} buổi)`}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Quy trình trị liệu được thực hiện tuần tự để đạt kết quả phục hồi da tốt nhất
        </p>
      </div>

      <div className="relative pl-6 before:absolute before:top-3 before:bottom-3 before:left-3 before:w-0.5 before:bg-border sm:pl-8">
        <ul className="space-y-6">
          {sessions.map((session) => {
            const badge = treatmentSessionStatusBadge(session.status);
            return (
              <li key={session.id} className="relative">
                {/* Node icon on timeline */}
                <span className="absolute -left-6 flex size-6 items-center justify-center rounded-full border-2 border-border bg-card text-xs font-bold text-foreground sm:-left-8 sm:size-7">
                  {session.status === 'completed' ? (
                    <CheckCircle2Icon className="text-success size-4" aria-hidden="true" />
                  ) : session.status === 'booked' ? (
                    <CalendarDaysIcon className="text-info size-3.5" aria-hidden="true" />
                  ) : session.status === 'skipped' ? (
                    <MinusCircleIcon
                      className="size-3.5 text-muted-foreground"
                      aria-hidden="true"
                    />
                  ) : (
                    <span>{session.sequenceNumber}</span>
                  )}
                </span>

                <div className="space-y-3 rounded-xl border bg-muted/20 p-4 transition-colors hover:bg-muted/30">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold tracking-wider text-primary uppercase">
                        {`Buổi ${session.sequenceNumber}`}
                      </span>
                      <h4 className="text-base font-semibold text-foreground">
                        {session.serviceName}
                      </h4>
                    </div>
                    <StatusBadge label={badge.label} tone={badge.tone} status={session.status} />
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ClockIcon className="size-3.5" aria-hidden="true" />
                    <span>{`Thời lượng: ${session.durationMinutes} phút`}</span>
                  </div>

                  {session.status === 'completed' && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/50 p-3 text-xs">
                      <div className="space-y-1">
                        {session.appointment && (
                          <div className="font-medium text-foreground">
                            {`Thực hiện: ${formatLocalDate(session.appointment.date)}`}
                          </div>
                        )}
                        {session.appointment?.staff && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <UserRoundIcon className="size-3 text-primary" aria-hidden="true" />
                            <span>{`Kỹ thuật viên: ${session.appointment.staff.fullName}`}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => onViewSessionResult(session)}
                        className="font-medium"
                      >
                        <FileTextIcon aria-hidden="true" />
                        Xem ghi chú trị liệu
                      </Button>
                    </div>
                  )}

                  {session.status === 'booked' && session.appointment && (
                    <div className="border-info/30 bg-info/10 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-xs">
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">
                          {`Lịch hẹn: ${formatLocalDate(session.appointment.date)} lúc ${session.appointment.startTime} – ${session.appointment.endTime}`}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <UserRoundIcon className="size-3 text-primary" aria-hidden="true" />
                          <span>{`Kỹ thuật viên: ${session.appointment.staff.fullName}`}</span>
                        </div>
                      </div>
                      <Button asChild size="sm" variant="outline" className="font-medium">
                        <Link to={`/my-bookings/${session.appointment.id}`}>
                          Xem lịch hẹn
                          <ExternalLinkIcon aria-hidden="true" />
                        </Link>
                      </Button>
                    </div>
                  )}

                  {session.status === 'not_booked' && (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      {session.canBook ? (
                        <div className="flex flex-wrap items-center gap-3">
                          <Button asChild size="sm" className="font-medium">
                            <Link
                              to={`/booking/new?treatmentSessionId=${session.id}&treatmentPlanId=${planId}`}
                            >
                              <CalendarPlusIcon aria-hidden="true" />
                              Đặt lịch buổi này
                            </Link>
                          </Button>
                          {session.earliestDate && (
                            <span className="text-xs text-muted-foreground">
                              {`Sớm nhất từ ${formatLocalDate(session.earliestDate)}`}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          {session.reason ?? 'Chưa đủ điều kiện đặt lịch buổi này.'}
                        </span>
                      )}
                    </div>
                  )}

                  {session.status === 'skipped' && (
                    <p className="text-xs text-muted-foreground italic">
                      Buổi này đã được bỏ qua trong phác đồ.
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
