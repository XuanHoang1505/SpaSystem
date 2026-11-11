import type { MyWorkSchedule } from '@spa/shared-types';
import { weekdayName } from '@/lib/formatting/vietnamTime';
import { cn } from '@/lib/utils';
import { isSameMonth, monthGridDays, weekDays } from '../../myScheduleRange';
import { MyShiftCard } from './MyShiftCard';

const weekdayHeaders = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;
const MONTH_CELL_LIMIT = 3;

const dayMonth = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

export function groupByDate(shifts: readonly MyWorkSchedule[]) {
  const byDate = new Map<string, MyWorkSchedule[]>();
  for (const shift of shifts) byDate.set(shift.date, [...(byDate.get(shift.date) ?? []), shift]);
  return byDate;
}

interface GridProps {
  date: string;
  today: string;
  shifts: readonly MyWorkSchedule[];
  onOpen: (id: string) => void;
}

/** Seven columns from `lg`; below that only the days with a shift, one under another. */
export function MyWeekGrid({ date, today, shifts, onOpen }: GridProps) {
  const byDate = groupByDate(shifts);
  return (
    <div className="grid gap-2 lg:grid-cols-7">
      {weekDays(date).map((day) => {
        const dayShifts = byDate.get(day) ?? [];
        return (
          <section
            key={day}
            aria-label={`${weekdayName(day)} ${dayMonth(day)}`}
            className={cn(
              'flex-col gap-2 rounded-xl border p-2.5 lg:flex lg:min-h-40',
              dayShifts.length === 0 ? 'hidden' : 'flex',
              day === today && 'border-primary/40 bg-accent/40',
            )}
          >
            <DayHeading day={day} today={today} />
            {dayShifts.map((shift) => (
              <MyShiftCard key={shift.id} shift={shift} onOpen={onOpen} />
            ))}
          </section>
        );
      })}
    </div>
  );
}

/** A 6 × 7 calendar from `md`; below that the same day list as the week. */
export function MyMonthGrid({ date, today, shifts, onOpen }: GridProps) {
  const byDate = groupByDate(shifts);
  const days = monthGridDays(date);
  return (
    <>
      <div className="hidden md:block">
        <div className="grid grid-cols-7 gap-1 pb-1 text-center text-xs font-medium text-muted-foreground">
          {weekdayHeaders.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dayShifts = byDate.get(day) ?? [];
            const hidden = dayShifts.length - MONTH_CELL_LIMIT;
            return (
              <div
                key={day}
                aria-label={`${weekdayName(day)} ${dayMonth(day)}`}
                className={cn(
                  'flex min-h-24 flex-col gap-1 rounded-lg border p-1.5',
                  !isSameMonth(day, date) && 'opacity-50',
                  day === today && 'border-primary/40 bg-accent/40',
                )}
              >
                <span
                  className={cn(
                    'text-xs font-medium',
                    day === today ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {Number(day.slice(8, 10))}
                </span>
                {dayShifts.slice(0, MONTH_CELL_LIMIT).map((shift) => (
                  <MyShiftCard key={shift.id} shift={shift} compact onOpen={onOpen} />
                ))}
                {hidden > 0 && (
                  <span className="text-xs text-muted-foreground">{`+${hidden} ca`}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="grid gap-2 md:hidden">
        {days
          .filter((day) => isSameMonth(day, date) && byDate.has(day))
          .map((day) => (
            <section key={day} className="flex flex-col gap-2 rounded-xl border p-2.5">
              <DayHeading day={day} today={today} />
              {(byDate.get(day) ?? []).map((shift) => (
                <MyShiftCard key={shift.id} shift={shift} onOpen={onOpen} />
              ))}
            </section>
          ))}
      </div>
    </>
  );
}

function DayHeading({ day, today }: { day: string; today: string }) {
  return (
    <h3 className="flex items-baseline justify-between gap-2 text-sm">
      <span className={cn('font-semibold', day === today && 'text-primary')}>
        {weekdayName(day)}
      </span>
      <span className="text-xs text-muted-foreground">
        {day === today ? `Hôm nay, ${dayMonth(day)}` : dayMonth(day)}
      </span>
    </h3>
  );
}
