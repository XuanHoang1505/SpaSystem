import type { WorkScheduleStatus } from '@spa/shared-types';
import { getTodayVnDate, addDaysToDate } from '@/features/bookings/utils/bookingHelpers';

export const workScheduleStatusLabels: Record<WorkScheduleStatus, string> = {
  active: 'Đang xếp ca',
  cancelled: 'Đã hủy',
};

/**
 * Returns the Monday (YYYY-MM-DD) for any given ISO date string.
 * Week starts on Monday (ISO-8601).
 */
export function getMondayOfDate(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  const year = parts[0] ?? 2026;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const date = new Date(Date.UTC(year, month - 1, day));
  // Day of week: 0 = Sun, 1 = Mon, ..., 6 = Sat
  const dayOfWeek = date.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(date.getTime() + diffToMonday * 24 * 60 * 60 * 1000);
  return monday.toISOString().slice(0, 10);
}

/**
 * Returns the Sunday (YYYY-MM-DD) for a Monday (YYYY-MM-DD).
 */
export function getSundayOfMonday(mondayStr: string): string {
  return addDaysToDate(mondayStr, 6);
}

export interface WeekDayInfo {
  dateStr: string; // YYYY-MM-DD
  dayLabel: string; // T2, T3, ..., CN
  fullDayLabel: string; // Thứ 2, Thứ 3, ..., Chủ Nhật
  dayNumber: number; // 9, 10, ...
  monthNumber: number; // 11
  isToday: boolean;
}

const VI_DAYS_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const VI_DAYS_FULL = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
];

/**
 * Generates an array of 7 days starting from Monday.
 */
export function generateWeekDays(
  mondayStr: string,
  todayStr: string = getTodayVnDate(),
): readonly WeekDayInfo[] {
  const result: WeekDayInfo[] = [];
  for (let i = 0; i < 7; i++) {
    const curDateStr = addDaysToDate(mondayStr, i);
    const parts = curDateStr.split('-').map(Number);
    const y = parts[0] ?? 2026;
    const m = parts[1] ?? 1;
    const d = parts[2] ?? 1;
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    const dayOfWeek = dateObj.getUTCDay();
    result.push({
      dateStr: curDateStr,
      dayLabel: VI_DAYS_SHORT[dayOfWeek] ?? 'CN',
      fullDayLabel: VI_DAYS_FULL[dayOfWeek] ?? 'Chủ Nhật',
      dayNumber: d,
      monthNumber: m,
      isToday: curDateStr === todayStr,
    });
  }
  return result;
}

/**
 * Formats a week range header string, e.g. "09/11 - 15/11/2026"
 */
export function formatWeekHeader(mondayStr: string, sundayStr: string): string {
  const p1 = mondayStr.split('-');
  const m1 = p1[1] ?? '';
  const d1 = p1[2] ?? '';
  const p2 = sundayStr.split('-');
  const y2 = p2[0] ?? '';
  const m2 = p2[1] ?? '';
  const d2 = p2[2] ?? '';
  return `${d1}/${m1} – ${d2}/${m2}/${y2}`;
}

/**
 * Formats month and year label, e.g. "Tháng 11, 2026"
 */
export function formatMonthYearHeader(dateStr: string): string {
  const parts = dateStr.split('-');
  const y = parts[0] ?? '2026';
  const m = Number(parts[1] ?? '1');
  return `Tháng ${m}, ${y}`;
}

/**
 * Formats full Vietnamese date, e.g. "Thứ Tư, 11/11/2026"
 */
export function formatFullVnDate(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  const y = parts[0] ?? 2026;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = dateObj.getUTCDay();
  const dayName = VI_DAYS_FULL[dayOfWeek] ?? '';
  const dd = d < 10 ? '0' + d : String(d);
  const mm = m < 10 ? '0' + m : String(m);
  return `${dayName}, ${dd}/${mm}/${y}`;
}

/**
 * Checks if current time is within a shift (HH:mm format).
 */
export function isCurrentlyInShift(
  dateStr: string,
  startTime: string,
  endTime: string,
  now: Date = new Date(),
): boolean {
  const todayStr = getTodayVnDate(now);
  if (dateStr !== todayStr) return false;
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const curMinutes = hours * 60 + minutes;

  const sp = startTime.split(':').map(Number);
  const sh = sp[0] ?? 0;
  const sm = sp[1] ?? 0;
  const ep = endTime.split(':').map(Number);
  const eh = ep[0] ?? 0;
  const em = ep[1] ?? 0;
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  return curMinutes >= startMinutes && curMinutes <= endMinutes;
}
