const parts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Ngày `yyyy-MM-dd` và giờ `HH:mm` hiện tại theo giờ Việt Nam (cùng múi giờ với lịch hẹn, ADR-0003). */
export function vietnamNow(now: Date = new Date()): { date: string; time: string } {
  const value = Object.fromEntries(parts.formatToParts(now).map((part) => [part.type, part.value]));
  return {
    date: `${value.year}-${value.month}-${value.day}`,
    time: `${value.hour}:${value.minute}`,
  };
}

/** Cộng ngày vào một ngày `yyyy-MM-dd` (không đổi múi giờ). */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (day ?? 1) + days));
  return value.toISOString().slice(0, 10);
}

const weekdays = [
  'Chủ nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
] as const;

/** Tên thứ của một ngày `yyyy-MM-dd` ("Chủ nhật", "Thứ Hai"...). */
export function weekdayName(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return weekdays[new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)).getUTCDay()] ?? '';
}

/** "Thứ Hai, 19/10/2026" từ `yyyy-MM-dd`. */
export function formatLongDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${weekdayName(date)}, ${day}/${month}/${year}`;
}

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
};

/** Cộng phút vào giờ `HH:mm`, dừng ở 23:59 (lịch không qua nửa đêm). */
export function addMinutes(time: string, minutes: number): string {
  const total = Math.min(toMinutes(time) + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Số phút giữa hai giờ `HH:mm` cùng ngày. */
export const durationMinutes = (startTime: string, endTime: string) =>
  toMinutes(endTime) - toMinutes(startTime);

const dateOnly = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Ngày lịch `yyyy-MM-dd` theo giờ Việt Nam của một mốc UTC (`...AtUtc`). */
export const vietnamDateOf = (utc: string): string => dateOnly.format(new Date(utc));
