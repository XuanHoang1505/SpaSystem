import { useMemo } from 'react';
import { PlusIcon } from 'lucide-react';
import type { WorkScheduleItem } from '@spa/shared-types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { vietnamNow, weekdayName } from '@/lib/formatting/vietnamTime';
import { ShiftCard } from './ShiftCard';

export interface WeeklyScheduleGridProps {
  days: string[];
  shifts: readonly WorkScheduleItem[];
  isLoading: boolean;
  onAddShiftOnDay: (date: string) => void;
  onEditShift: (shift: WorkScheduleItem) => void;
  onCancelShift: (shift: WorkScheduleItem) => void;
}

export function WeeklyScheduleGrid({
  days,
  shifts,
  isLoading,
  onAddShiftOnDay,
  onEditShift,
  onCancelShift,
}: WeeklyScheduleGridProps) {
  const today = vietnamNow().date;

  // Group shifts by date (YYYY-MM-DD)
  const shiftsByDate = useMemo(() => {
    const map = new Map<string, WorkScheduleItem[]>();
    const safeShifts = Array.isArray(shifts) ? shifts : [];
    for (const shift of safeShifts) {
      const list = map.get(shift.date) ?? [];
      list.push(shift);
      map.set(shift.date, list);
    }
    // Sort each day's shifts by startTime
    for (const [, list] of map.entries()) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [shifts]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        {days.map((day) => (
          <div key={day} className="min-h-[300px] space-y-3 rounded-xl border bg-card p-3">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-16" />
            <div className="space-y-2 pt-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
      {days.map((date) => {
        const isToday = date === today;
        const dayShifts = shiftsByDate.get(date) ?? [];
        const [, month, day] = date.split('-');

        return (
          <div
            key={date}
            className={`flex min-h-[360px] flex-col rounded-xl border transition-colors ${
              isToday ? 'border-primary/50 bg-primary/5' : 'border-border bg-card/60'
            }`}
          >
            {/* Day Header */}
            <div className="flex items-center justify-between rounded-t-xl border-b bg-muted/20 p-3">
              <div>
                <span className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {weekdayName(date)}
                </span>
                <span
                  className={`text-sm font-bold ${isToday ? 'text-primary' : 'text-foreground'}`}
                >
                  {day}/{month}
                </span>
              </div>
              {isToday && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Hôm nay
                </span>
              )}
            </div>

            {/* Shifts in Day */}
            <div className="flex-1 space-y-2 overflow-y-auto p-2">
              {dayShifts.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center text-center text-xs text-muted-foreground/80">
                  <span>Chưa có ca làm</span>
                </div>
              ) : (
                dayShifts.map((shift) => (
                  <ShiftCard
                    key={shift.id}
                    shift={shift}
                    onEdit={onEditShift}
                    onCancel={onCancelShift}
                  />
                ))
              )}
            </div>

            {/* Add Shift Quick Action */}
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAddShiftOnDay(date)}
                className="h-7 w-full gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <PlusIcon className="size-3" />
                Thêm ca
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
