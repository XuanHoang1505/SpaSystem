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
