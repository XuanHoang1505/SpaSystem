import { ClockIcon } from 'lucide-react';
import type { MyWorkSchedule } from '@spa/shared-types';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { formatLocalDate, formatLocalTime } from '@/lib/formatting/formatters';
import { cn } from '@/lib/utils';

const timeRange = (shift: MyWorkSchedule) =>
  `${formatLocalTime(shift.startTime)} – ${formatLocalTime(shift.endTime)}`;

const appointmentsLabel = (count: number) =>
  count === 0 ? 'Chưa có lịch hẹn' : `${count} lịch hẹn`;

/** One shift; `compact` is the month-grid chip (time only). Cancelled shifts are dimmed and struck through. */
export function MyShiftCard({
  shift,
  compact = false,
  onOpen,
}: {
  shift: MyWorkSchedule;
  compact?: boolean;
  onOpen: (id: string) => void;
}) {
  const cancelled = shift.status === 'cancelled';
  const label = `Ca ${formatLocalDate(shift.date)} ${timeRange(shift)}, ${
    cancelled ? 'đã hủy' : appointmentsLabel(shift.appointmentCount).toLowerCase()
  }`;

  if (compact)
    return (
      <button
        type="button"
        aria-label={label}
        onClick={() => onOpen(shift.id)}
        className={cn(
          'w-full truncate rounded-md px-1.5 py-0.5 text-left text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          cancelled
            ? 'bg-muted text-muted-foreground line-through'
            : 'bg-primary/10 text-primary hover:bg-primary/20',
        )}
      >
        {timeRange(shift)}
      </button>
    );

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => onOpen(shift.id)}
      className={cn(
        'flex w-full flex-col gap-1.5 rounded-lg border p-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        cancelled
          ? 'border-dashed bg-muted/50 text-muted-foreground'
          : 'border-primary/20 bg-primary/10 hover:bg-primary/15',
      )}
    >
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        <ClockIcon className="size-3.5 shrink-0" aria-hidden="true" />
        <span className={cn(cancelled && 'line-through')}>{timeRange(shift)}</span>
      </span>
      {cancelled ? (
        <StatusBadge label="Đã hủy" tone="danger" />
      ) : (
        <span className="text-xs text-muted-foreground">
          {appointmentsLabel(shift.appointmentCount)}
        </span>
      )}
    </button>
  );
}
