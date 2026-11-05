const currency = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});
const number = new Intl.NumberFormat('vi-VN');
const dateTime = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const time = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** 1500000 → "1.500.000 ₫". */
export const formatCurrency = (value: number) => currency.format(value);

export const formatNumber = (value: number) => number.format(value);

/** Mốc thời gian UTC từ backend (`...AtUtc`) → giờ Việt Nam "04/11/2026 22:30". */
export const formatDateTimeUtc = (value: string) => dateTime.format(new Date(value));

/**
 * Ngày `DateOnly` của lịch hẹn/ca làm ("2026-11-04") → "04/11/2026".
 * Đây đã là ngày giờ Việt Nam (ADR-0003), không đổi múi giờ.
 */
export function formatLocalDate(value: string) {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

/** Giờ `TimeOnly` dạng "HH:mm" hoặc "HH:mm:ss" → "HH:mm", không đổi múi giờ. */
export const formatLocalTime = (value: string) => value.slice(0, 5);

/** Mốc thời gian UTC từ backend (`...AtUtc`) → giờ Việt Nam "HH:mm". */
export const formatTimeUtc = (value: string) => time.format(new Date(value));
