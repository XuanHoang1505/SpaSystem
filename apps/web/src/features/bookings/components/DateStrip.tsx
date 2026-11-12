import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { addDays, formatLongDate, weekdayName } from '@/lib/formatting/vietnamTime';
import { cn } from '@/lib/utils';

const DAYS_PER_PAGE = 7;
const shortWeekday: Record<string, string> = {
  'Thứ Hai': 'T2',
  'Thứ Ba': 'T3',
  'Thứ Tư': 'T4',
  'Thứ Năm': 'T5',
  'Thứ Sáu': 'T6',
  'Thứ Bảy': 'T7',
  'Chủ nhật': 'CN',
};

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** The first day of the week page that shows `value`, counted from `minDate` in steps of seven days. */
const pageStart = (value: string | null, minDate: string, maxDate: string) => {
  if (!value || value < minDate || value > maxDate) return minDate;
  return addDays(minDate, Math.floor(daysBetween(minDate, value) / DAYS_PER_PAGE) * DAYS_PER_PAGE);
};

/** Seven days at a time between `minDate` and `maxDate` (inclusive, Vietnam dates `yyyy-MM-dd`). */
export function DateStrip({
  value,
  onChange,
  minDate,
  maxDate,
}: {
  value: string | null;
  onChange: (date: string) => void;
  minDate: string;
  maxDate: string;
}) {
  const [start, setStart] = useState(() => pageStart(value, minDate, maxDate));
  const days = Array.from({ length: DAYS_PER_PAGE }, (_, index) => addDays(start, index));
  const [year, month] = start.split('-');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{`Tháng ${month}/${year}`}</p>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Tuần trước"
            disabled={start <= minDate}
            onClick={() => setStart(addDays(start, -DAYS_PER_PAGE))}
          >
            <ChevronLeftIcon className="size-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Tuần sau"
            disabled={addDays(start, DAYS_PER_PAGE) > maxDate}
            onClick={() => setStart(addDays(start, DAYS_PER_PAGE))}
          >
            <ChevronRightIcon className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div role="group" aria-label="Chọn ngày" className="grid grid-cols-7 gap-1.5">
        {days.map((date) => {
          const selected = date === value;
          const outside = date < minDate || date > maxDate;
          return (
            <button
              key={date}
              type="button"
              aria-label={formatLongDate(date)}
              aria-pressed={selected}
              disabled={outside}
              onClick={() => onChange(date)}
              className={cn(
                'flex min-w-0 flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-card hover:border-primary/40',
              )}
            >
              <span className="text-xs">{shortWeekday[weekdayName(date)]}</span>
              <span className="text-base font-semibold">{date.slice(8)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
