import { CalendarX2Icon, ClockIcon, MoreVerticalIcon, PencilIcon } from 'lucide-react';
import type { WorkScheduleItem } from '@spa/shared-types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface ShiftCardProps {
  shift: WorkScheduleItem;
  onEdit: (shift: WorkScheduleItem) => void;
  onCancel: (shift: WorkScheduleItem) => void;
}

export function ShiftCard({ shift, onEdit, onCancel }: ShiftCardProps) {
  const isCancelled = shift.status === 'cancelled';

  return (
    <div
      className={`group relative rounded-lg border p-2.5 text-xs transition-all ${
        isCancelled
          ? 'border-border/60 bg-muted/40 text-muted-foreground line-through opacity-70'
          : 'border-border bg-card shadow-2xs hover:border-primary/40 hover:shadow-xs'
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={`block truncate font-semibold ${
            isCancelled ? 'text-muted-foreground' : 'text-foreground'
          }`}
          title={shift.staffName}
        >
          {shift.staffName}
        </span>

        {!isCancelled && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-5 shrink-0 no-underline opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Tùy chọn ca làm"
              >
                <MoreVerticalIcon className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem onClick={() => onEdit(shift)} className="gap-2">
                <PencilIcon className="size-3.5" />
                Sửa ca làm
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onCancel(shift)}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <CalendarX2Icon className="size-3.5" />
                Hủy ca làm
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="mt-1 flex items-center gap-1.5 text-muted-foreground no-underline">
        <ClockIcon className="size-3 shrink-0" />
        <span className="font-mono text-[11px] font-medium">
          {shift.startTime} – {shift.endTime}
        </span>
      </div>

      {isCancelled && (
        <span className="mt-1.5 inline-block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Đã hủy
        </span>
      )}
    </div>
  );
}
