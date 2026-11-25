import { expect, test } from 'vitest';
import { formatDuration, formatTimeUtc, formatWeekdayDate } from './formatters';

test('formatTimeUtc shows a UTC instant as Vietnam time HH:mm', () => {
  expect(formatTimeUtc('2026-11-05T03:07:00Z')).toBe('10:07');
  expect(formatTimeUtc('2026-11-05T17:30:00Z')).toBe('00:30');
});

test('formatDuration shows minutes as hours and minutes (CAT-UI-T15)', () => {
  expect(formatDuration(45)).toBe('45 phút');
  expect(formatDuration(60)).toBe('1 giờ');
  expect(formatDuration(90)).toBe('1 giờ 30 phút');
  expect(formatDuration(120)).toBe('2 giờ');
});

test('formatWeekdayDate shows the Vietnam date with its weekday', () => {
  expect(formatWeekdayDate(new Date('2026-11-21T03:00:00Z'))).toBe('Thứ Bảy, 21/11/2026');
  // 18:30 UTC on Saturday is already Sunday in Vietnam.
  expect(formatWeekdayDate(new Date('2026-11-21T18:30:00Z'))).toBe('Chủ Nhật, 22/11/2026');
});
