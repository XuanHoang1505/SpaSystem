import { ArrowRightIcon, CalendarPlusIcon, CheckIcon, ClockIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MyTreatmentSession } from '@spa/shared-types';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Button } from '@/components/ui/button';
import { bookingPath } from '@/features/bookings/bookingParams';
import { formatLocalDate, formatLocalTime } from '@/lib/formatting/formatters';
import { formatLongDate, vietnamDateOf } from '@/lib/formatting/vietnamTime';
import { cn } from '@/lib/utils';
import { sessionStatusBadge } from '../purchaseStatus';

function SessionDetail({
  session,
  planId,
  onViewNote,
}: {
  session: MyTreatmentSession;
  planId: string;
  onViewNote: (session: MyTreatmentSession) => void;
}) {
  const appointment = session.appointment;
  if (session.status === 'completed') {
    const date =
      appointment?.date ?? (session.completedAtUtc && vietnamDateOf(session.completedAtUtc));
    const parts = [
      date ? `Thực hiện ngày ${formatLocalDate(date)}` : 'Đã thực hiện',
      appointment ? `Kỹ thuật viên ${appointment.staff.fullName}` : null,
      `${session.durationMinutes} phút`,
    ].filter(Boolean);
    return (
      <>
        <p className="text-sm text-muted-foreground">{parts.join(', ')}</p>
        <Button variant="outline" size="sm" onClick={() => onViewNote(session)}>
          Xem ghi chú trị liệu
          <ArrowRightIcon aria-hidden="true" />
        </Button>
      </>
    );
  }
  if (session.status === 'booked' && appointment)
    return (
      <>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <ClockIcon className="size-4 shrink-0" aria-hidden="true" />
          {`${formatLongDate(appointment.date)} · ${formatLocalTime(appointment.startTime)} – ${formatLocalTime(appointment.endTime)} · ${appointment.staff.fullName}`}
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to={`/my-bookings/${appointment.id}`}>Xem lịch hẹn</Link>
        </Button>
      </>
    );
  if (session.status === 'skipped')
    return <p className="text-sm text-muted-foreground">Buổi này đã được bỏ qua</p>;
  if (session.status === 'not_booked' && session.canBook)
    return (
      <>
        {session.earliestDate && (
          <p className="text-sm text-muted-foreground">{`Đặt được sớm nhất từ ${formatLocalDate(session.earliestDate)}`}</p>
        )}
        <Button asChild size="sm">
          <Link
            to={bookingPath({
              kind: 'session',
              treatmentSessionId: session.id,
              treatmentPlanId: planId,
            })}
          >
            <CalendarPlusIcon aria-hidden="true" />
            Đặt lịch buổi này
          </Link>
        </Button>
      </>
    );
  return session.reason ? <p className="text-sm text-muted-foreground">{session.reason}</p> : null;
}

/** The ordered sessions of a treatment plan, one row per session. */
export function SessionJournal({
  planId,
  sessions,
  onViewNote,
}: {
  planId: string;
  sessions: readonly MyTreatmentSession[];
  onViewNote: (session: MyTreatmentSession) => void;
}) {
  const ordered = [...sessions].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  return (
    <ol className="space-y-3">
      {ordered.map((session) => {
        const badge = sessionStatusBadge(session.status);
        const done = session.status === 'completed';
        return (
          <li
            key={session.id}
            data-testid={`session-${session.sequenceNumber}`}
            className="flex gap-3 rounded-2xl border bg-card p-4"
          >
            <span
              aria-hidden="true"
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold',
                done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              {done ? <CheckIcon className="size-4" /> : session.sequenceNumber}
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground">{`BUỔI ${session.sequenceNumber}`}</span>
                <StatusBadge label={badge.label} tone={badge.tone} status={session.status} />
              </div>
              <h3 className="font-sans text-base font-semibold">{session.serviceName}</h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <SessionDetail session={session} planId={planId} onViewNote={onViewNote} />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
