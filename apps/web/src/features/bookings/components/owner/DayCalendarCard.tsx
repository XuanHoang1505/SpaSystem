import { GripVerticalIcon } from 'lucide-react';
import type { AppointmentListItem } from '@spa/shared-types';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { cn } from '@/lib/utils';
import { appointmentStatusBadge } from '../../appointmentStatus';
import { isDraggable } from './dayGrid';

export interface DayCalendarCardProps {
  appointment: AppointmentListItem;
  placement: {
    rowStart: number;
    rowSpan: number;
    lane: number;
    laneCount: number;
  };
  colIndex: number;
  onOpen: (id: string) => void;
  isBusy?: boolean;
  gripAttributes?: React.HTMLAttributes<HTMLElement>;
  gripListeners?: Record<string, unknown>;
  dragRef?: (element: HTMLElement | null) => void;
  style?: React.CSSProperties;
}

export function DayCalendarCard({
  appointment,
  placement,
  colIndex,
  onOpen,
  isBusy,
  gripAttributes,
  gripListeners,
  dragRef,
  style: extraStyle,
}: DayCalendarCardProps) {
  const badge = appointmentStatusBadge(appointment.status);
  const canDrag = isDraggable(appointment.status) && !isBusy;

  const cardStyle: React.CSSProperties = {
    gridRow: `${placement.rowStart + 1} / span ${placement.rowSpan}`,
    gridColumn: colIndex + 2,
    marginLeft: `${(placement.lane * 100) / placement.laneCount}%`,
    width: `calc(${100 / placement.laneCount}% - 4px)`,
    zIndex: 10,
    ...extraStyle,
  };

  return (
    <div
      ref={dragRef}
      style={cardStyle}
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-md border bg-card p-1.5 shadow-xs transition-shadow focus-within:ring-2 focus-within:ring-ring hover:shadow-sm',
        isBusy && 'pointer-events-none opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <button
          type="button"
          onClick={() => onOpen(appointment.id)}
          className="min-w-0 flex-1 text-left focus:outline-hidden"
          aria-label={`Lịch hẹn của ${appointment.customer.fullName}, ${appointment.service.name}, ${appointment.startTime} – ${appointment.endTime}, ${badge.label}`}
        >
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-foreground">
              {appointment.startTime} – {appointment.endTime}
            </span>
          </div>
          <p className="truncate text-xs font-medium text-foreground">
            {appointment.customer.fullName}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">{appointment.service.name}</p>
        </button>

        {canDrag && (
          <button
            type="button"
            aria-label={`Kéo để đổi giờ hoặc nhân viên cho lịch của ${appointment.customer.fullName}`}
            className="cursor-grab touch-none p-0.5 text-muted-foreground hover:text-foreground focus:outline-hidden active:cursor-grabbing"
            {...gripAttributes}
            {...gripListeners}
          >
            <GripVerticalIcon className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="mt-1 flex items-center justify-between">
        <StatusBadge
          label={badge.label}
          tone={badge.tone}
          className="px-1 py-0 text-[10px] leading-tight"
        />
      </div>
    </div>
  );
}
