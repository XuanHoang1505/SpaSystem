import { expect, test } from 'vitest';
import { formatDuration, formatTimeUtc } from './formatters';

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
