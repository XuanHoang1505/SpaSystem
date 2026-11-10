import { CalendarClockIcon, CalendarPlusIcon, ClockIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PurchasedService } from '@spa/shared-types';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Button } from '@/components/ui/button';
import { bookingPath } from '@/features/bookings/bookingParams';
import { formatDuration, formatLocalDate, formatLocalTime } from '@/lib/formatting/formatters';
import { vietnamDateOf } from '@/lib/formatting/vietnamTime';
import { entitlementStatusBadge } from '../purchaseStatus';

export function ServiceCard({
  item,
  onViewOrder,
}: {
  item: PurchasedService;
  onViewOrder: (order: { id: string; code: string }) => void;
}) {
  const badge = entitlementStatusBadge(item.status);
  const appointment = item.appointment;
  return (
    <article className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <h3 className="font-sans text-base font-semibold">{item.serviceName}</h3>
          <button
            type="button"
            onClick={() => onViewOrder(item.order)}
            className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {`Đơn ${item.order.code}`}
          </button>
        </div>
        <StatusBadge label={badge.label} tone={badge.tone} status={item.status} />
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <ClockIcon className="size-4" aria-hidden="true" />
          {formatDuration(item.durationMinutes)}
        </span>
        {item.expiresAtUtc ? (
          <span className="flex items-center gap-1.5">
            <CalendarClockIcon className="size-4" aria-hidden="true" />
            {`Hạn đến ${formatLocalDate(vietnamDateOf(item.expiresAtUtc))}`}
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <CalendarClockIcon className="size-4" aria-hidden="true" />
            Không giới hạn
          </span>
        )}
      </div>

      {appointment && item.status === 'booked' && (
        <p className="text-sm">
          {`Đã đặt: ${formatLocalDate(appointment.date)} lúc ${formatLocalTime(appointment.startTime)}`}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {item.canBook && (
          <Button asChild>
            <Link to={bookingPath({ kind: 'entitlement', serviceEntitlementId: item.id })}>
              <CalendarPlusIcon aria-hidden="true" />
              Đặt lịch
            </Link>
          </Button>
        )}
        {appointment && (
          <Button asChild variant="outline">
            <Link to={`/my-bookings/${appointment.id}`}>Xem lịch hẹn</Link>
          </Button>
        )}
      </div>
    </article>
  );
}
