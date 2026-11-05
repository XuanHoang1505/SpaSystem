import { expect, test } from 'vitest';
import { formatTimeUtc } from './formatters';

test('formatTimeUtc shows a UTC instant as Vietnam time HH:mm', () => {
  expect(formatTimeUtc('2026-11-05T03:07:00Z')).toBe('10:07');
  expect(formatTimeUtc('2026-11-05T17:30:00Z')).toBe('00:30');
});
