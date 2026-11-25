import { CalendarClockIcon, RotateCcwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatLocalDate } from '@/lib/formatting/formatters';
import { useNextSlots, type NextSlotsDay } from '../hooks/useNextSlots';
import { BookServiceButton } from './BookServiceButton';

/**
 * "Giờ trống gần nhất" trên trang chi tiết dịch vụ: giờ thật từ lịch làm việc và lịch hẹn. Bấm một giờ sang trang đặt
 * lịch với ngày và giờ đó được điền sẵn (UC-SPA-15).
 */
export function NextAvailableSlots({ serviceId }: { serviceId: string }) {
  const { days, isError, retry } = useNextSlots(serviceId);
  return (
    <section
      aria-labelledby="next-slots"
      className="overflow-hidden rounded-2xl border bg-card shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-5 py-4">
        <div className="space-y-0.5">
          <h2
            id="next-slots"
            className="flex items-center gap-2 font-heading text-base font-semibold"
          >
            <CalendarClockIcon className="size-4 text-primary" aria-hidden="true" />
            Giờ trống gần nhất
          </h2>
          <p className="text-xs text-muted-foreground">Bấm chọn khung giờ để đặt lịch nhanh</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          Trực tiếp
        </span>
      </div>

      <div className="space-y-4 p-5">
        {isError ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <p>Không tải được giờ trống.</p>
            <Button variant="outline" size="sm" onClick={retry}>
              <RotateCcwIcon aria-hidden="true" />
              Tải lại giờ trống
            </Button>
          </div>
        ) : (
          days.map((day) => <SlotDay key={day.date} day={day} serviceId={serviceId} />)
        )}
        <p className="border-t pt-3 text-[11px] text-muted-foreground">
          Theo lịch làm việc thực tế của kỹ thuật viên, giờ Việt Nam.
        </p>
      </div>
    </section>
  );
}

function SlotDay({ day, serviceId }: { day: NextSlotsDay; serviceId: string }) {
  const name = `${day.label} · ${formatLocalDate(day.date)}`;
  return (
    <div role="group" aria-label={name} className="space-y-2">
      <p className="text-xs font-semibold text-foreground/80">{name}</p>
      {day.times === undefined ? (
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>
      ) : day.times.length === 0 ? (
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Đã kín lịch trong ngày này
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {day.times.map((time) => (
            <BookServiceButton
              key={time}
              serviceId={serviceId}
              prefill={{ date: day.date, startTime: time }}
              size="sm"
              variant="outline"
              className="w-full justify-center rounded-lg bg-background font-medium tabular-nums hover:border-primary hover:bg-primary/5 hover:text-primary"
            >
              {time}
            </BookServiceButton>
          ))}
        </div>
      )}
    </div>
  );
}
