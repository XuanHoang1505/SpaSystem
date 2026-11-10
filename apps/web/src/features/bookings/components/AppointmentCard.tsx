import {
  CalendarDaysIcon,
  ChevronRightIcon,
  ClockIcon,
  InfoIcon,
  UserRoundIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MyAppointmentListItem } from '@spa/shared-types';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { catalogPolicies } from '@/features/services/catalogPolicies';
import { formatLocalTime, formatTimeUtc } from '@/lib/formatting/formatters';
import { durationMinutes, formatLongDate } from '@/lib/formatting/vietnamTime';
import { appointmentStatusBadge } from '../appointmentStatus';

const compactStatuses: readonly MyAppointmentListItem['status'][] = [
  'completed',
  'no_show',
  'cancelled',
  'hold_expired',
];

function sourceLabel(appointment: MyAppointmentListItem): string {
  if (appointment.treatmentSession)
    return `LIỆU TRÌNH ${appointment.treatmentSession.packageName} · BUỔI ${appointment.treatmentSession.sequenceNumber}`;
  return appointment.source === 'entitlement' ? 'DỊCH VỤ ĐÃ MUA' : 'ĐẶT NGAY';
}

/** One appointment in the list: a large card for upcoming ones, a compact one for past and cancelled. */
export function AppointmentCard({
  appointment,
  onReschedule,
  onCancel,
}: {
  appointment: MyAppointmentListItem;
  onReschedule: (appointment: MyAppointmentListItem) => void;
  onCancel: (appointment: MyAppointmentListItem) => void;
}) {
  const badge = appointmentStatusBadge(appointment.status);
  const compact = compactStatuses.includes(appointment.status);
  const minutes = durationMinutes(appointment.startTime, appointment.endTime);
  const when = `${formatLongDate(appointment.date)} · ${formatLocalTime(appointment.startTime)} – ${formatLocalTime(appointment.endTime)} (${minutes} phút)`;
  const changeable = appointment.canReschedule || appointment.canCancel;

  return (
    <article className="space-y-4 rounded-2xl border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
            <CalendarDaysIcon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Thời gian buổi hẹn
            </p>
            <p className="flex items-center gap-1.5 text-base font-semibold">
              <ClockIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              {when}
            </p>
          </div>
        </div>
        <StatusBadge label={badge.label} tone={badge.tone} status={appointment.status} />
      </div>

      <div className="space-y-1 border-t pt-4">
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground">
          {sourceLabel(appointment)}
        </p>
        <h3 className="font-heading text-xl">{appointment.service.name}</h3>
        {!compact && (
          <p className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
            <UserRoundIcon className="size-4 shrink-0" aria-hidden="true" />
            {`Kỹ thuật viên: ${appointment.staff.fullName}`}
          </p>
        )}
      </div>

      {appointment.status === 'held' && appointment.holdExpiresAtUtc && (
        <Alert>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{`Giữ chỗ đến ${formatTimeUtc(appointment.holdExpiresAtUtc)}. Hãy thanh toán để giữ lịch hẹn này.`}</span>
            <Button asChild size="sm">
              <Link to={`/my-bookings/${appointment.id}`}>Xem và thanh toán</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {changeable ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <InfoIcon className="size-3.5 shrink-0" aria-hidden="true" />
            {`Có thể đổi hoặc hủy trước giờ hẹn ${catalogPolicies.customerChangeCutoffHours} giờ`}
          </p>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/my-bookings/${appointment.id}`}>
              Chi tiết
              <ChevronRightIcon aria-hidden="true" />
            </Link>
          </Button>
          {appointment.canReschedule && (
            <Button variant="outline" size="sm" onClick={() => onReschedule(appointment)}>
              Đổi giờ hẹn
            </Button>
          )}
          {appointment.canCancel && (
            <Button variant="outline" size="sm" onClick={() => onCancel(appointment)}>
              Hủy lịch
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
