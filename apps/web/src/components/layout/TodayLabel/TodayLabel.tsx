import { useEffect, useState } from 'react';
import { CalendarDaysIcon } from 'lucide-react';
import { formatWeekdayDate } from '@/lib/formatting/formatters';

/** Today in Vietnam, "Chủ Nhật, 22/11/2026", for the workspace header. Rechecked every minute so it turns at midnight. */
export function TodayLabel({ className }: { className?: string }) {
  const [today, setToday] = useState(() => formatWeekdayDate(new Date()));

  useEffect(() => {
    const timer = window.setInterval(() => setToday(formatWeekdayDate(new Date())), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <span className={className}>
      <CalendarDaysIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />
      <span className="sr-only">Hôm nay: </span>
      <span className="truncate">{today}</span>
    </span>
  );
}
