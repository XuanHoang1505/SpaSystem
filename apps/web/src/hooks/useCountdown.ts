import { useEffect, useState } from 'react';

const secondsUntil = (targetUtc: string | null) =>
  targetUtc ? Math.max(0, Math.ceil((Date.parse(targetUtc) - Date.now()) / 1000)) : 0;

/** Whole seconds left until a server UTC time, ticking every second and stopping at 0. */
export function useCountdown(targetUtc: string | null): number {
  const [seconds, setSeconds] = useState(() => secondsUntil(targetUtc));

  useEffect(() => {
    setSeconds(secondsUntil(targetUtc));
    if (secondsUntil(targetUtc) === 0) return;
    const timer = setInterval(() => {
      const left = secondsUntil(targetUtc);
      setSeconds(left);
      if (left === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [targetUtc]);

  return seconds;
}
