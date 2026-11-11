import { useSearchParams } from 'react-router-dom';
import { vietnamNow } from '@/lib/formatting/vietnamTime';
import { rangeFor, shiftAnchor, type DateRange, type MyScheduleView } from '../../myScheduleRange';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export interface MyScheduleParams {
  view: MyScheduleView;
  /** A day inside the week or month being shown. */
  date: string;
  today: string;
  range: DateRange;
  setView: (view: MyScheduleView) => void;
  step: (direction: 1 | -1) => void;
  goToday: () => void;
}

/** SCR-W25 state on the URL: `view=week|month`, `date=yyyy-MM-dd` (Vietnam date). */
export function useMyScheduleParams(today: string = vietnamNow().date): MyScheduleParams {
  const [searchParams, setSearchParams] = useSearchParams();
  const view: MyScheduleView = searchParams.get('view') === 'month' ? 'month' : 'week';
  const rawDate = searchParams.get('date');
  const date = rawDate && datePattern.test(rawDate) ? rawDate : today;

  const update = (changes: Record<string, string | null>) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value === null) next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );

  return {
    view,
    date,
    today,
    range: rangeFor(date, view),
    setView: (next) => update({ view: next === 'week' ? null : next }),
    step: (direction) => update({ date: shiftAnchor(date, view, direction) }),
    goToday: () => update({ date: null }),
  };
}
