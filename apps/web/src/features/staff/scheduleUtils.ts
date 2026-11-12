import { addDays } from '@/lib/formatting/vietnamTime';

/**
 * Returns the Monday of the week containing dateStr (YYYY-MM-DD).
 * Weeks in Vietnam run from Monday to Sunday.
 */
export function getMondayOfWeek(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  const dayOfWeek = date.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  return addDays(dateStr, diff);
}

/**
 * Returns the 7 days of the week containing dateStr, along with fromDate (Mon) and toDate (Sun).
 */
export function getWeekRange(dateStr: string): {
  fromDate: string;
  toDate: string;
  days: string[];
} {
  const monday = getMondayOfWeek(dateStr);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  return {
    fromDate: monday,
    toDate: days[6] ?? monday,
    days,
  };
}

export const weekdayLabels = [
  { day: 1, label: 'Thứ 2' },
  { day: 2, label: 'Thứ 3' },
  { day: 3, label: 'Thứ 4' },
  { day: 4, label: 'Thứ 5' },
  { day: 5, label: 'Thứ 6' },
  { day: 6, label: 'Thứ 7' },
  { day: 0, label: 'Chủ nhật' },
] as const;
