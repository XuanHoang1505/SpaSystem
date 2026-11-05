import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useCountdown } from './useCountdown';

const now = new Date('2026-11-05T10:00:00Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});
afterEach(() => vi.useRealTimers());

test('counts down every second and stops at zero', () => {
  const { result } = renderHook(() => useCountdown('2026-11-05T10:00:03Z'));
  expect(result.current).toBe(3);
  act(() => vi.advanceTimersByTime(1000));
  expect(result.current).toBe(2);
  act(() => vi.advanceTimersByTime(2000));
  expect(result.current).toBe(0);
  act(() => vi.advanceTimersByTime(5000));
  expect(result.current).toBe(0);
  expect(vi.getTimerCount()).toBe(0);
});

test('a past or missing target is zero', () => {
  expect(renderHook(() => useCountdown('2026-11-05T09:00:00Z')).result.current).toBe(0);
  expect(renderHook(() => useCountdown(null)).result.current).toBe(0);
});

test('restarts when the target changes', () => {
  const { result, rerender } = renderHook(({ target }) => useCountdown(target), {
    initialProps: { target: '2026-11-05T10:00:01Z' },
  });
  act(() => vi.advanceTimersByTime(1000));
  expect(result.current).toBe(0);
  rerender({ target: '2026-11-05T10:01:01Z' });
  expect(result.current).toBe(60);
});

test('useCountdown clears its interval on unmount', () => {
  const { unmount } = renderHook(() => useCountdown('2026-11-05T10:05:00Z'));
  expect(vi.getTimerCount()).toBe(1);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
