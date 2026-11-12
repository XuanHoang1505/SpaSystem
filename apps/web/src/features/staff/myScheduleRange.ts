import { addDays } from '@/lib/formatting/vietnamTime';

export type MyScheduleView = 'week' | 'month';

export interface DateRange {
  from: string;
  to: string;
}

const parts = (date: string) => {
  const [year = 1970, month = 1, day = 1] = date.split('-').map(Number);
  return { year, month, day };
};

/** 0 = Monday … 6 = Sunday. */
const mondayIndex = (date: string) => {
  const { year, month, day } = parts(date);
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
};

const firstOfMonth = (date: string) => `${date.slice(0, 7)}-01`;

/** Monday → Sunday of the week holding `date` (Vietnam dates, no time zone maths). */
export function weekRange(date: string): DateRange {
  const from = addDays(date, -mondayIndex(date));
  return { from, to: addDays(from, 6) };
}

/** Six weeks from the Monday on or before the 1st: always 42 days, the backend's range limit. */
export function monthGridRange(date: string): DateRange {
  const first = firstOfMonth(date);
  const from = addDays(first, -mondayIndex(first));
  return { from, to: addDays(from, 41) };
}

export function monthGridDays(date: string): readonly string[] {
  const { from } = monthGridRange(date);
  return Array.from({ length: 42 }, (_, index) => addDays(from, index));
}

export function weekDays(date: string): readonly string[] {
  const { from } = weekRange(date);
  return Array.from({ length: 7 }, (_, index) => addDays(from, index));
}

/** The next/previous anchor: ±7 days, or the 1st of the next/previous month. */
export function shiftAnchor(date: string, view: MyScheduleView, step: 1 | -1): string {
  if (view === 'week') return addDays(date, 7 * step);
  const { year, month } = parts(date);
  const next = new Date(Date.UTC(year, month - 1 + step, 1));
  return next.toISOString().slice(0, 10);
}

export const rangeFor = (date: string, view: MyScheduleView): DateRange =>
  view === 'week' ? weekRange(date) : monthGridRange(date);

/** Same calendar month as `anchor` (month grid shows days of the neighbouring months dimmed). */
export const isSameMonth = (date: string, anchor: string) =>
  date.slice(0, 7) === anchor.slice(0, 7);
