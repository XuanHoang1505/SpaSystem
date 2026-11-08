import { CalendarClockIcon, RotateCcwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ComingSoonButton } from '@/features/services';
import { formatLocalDate } from '@/lib/formatting/formatters';
import { useNextSlots, type NextSlotsDay } from '../hooks/useNextSlots';

/**
 * "Giờ trống gần nhất" trên trang chi tiết dịch vụ: giờ thật từ lịch làm việc và lịch hẹn. Bấm một giờ tạm báo "đang
 * phát triển" (đặt lịch trên web là UC-SPA-15).
 */
export function NextAvailableSlots({ serviceId }: { serviceId: string }) {
  const { days, isError, retry } = useNextSlots(serviceId);
  return (
    <section aria-labelledby="next-slots" className="space-y-4 rounded-xl border bg-card p-5">
      <h2 id="next-slots" className="flex items-center gap-2 text-lg">
        <CalendarClockIcon className="size-5 text-primary" aria-hidden="true" />
        Giờ trống gần nhất
      </h2>
      {isError ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <p>Không tải được giờ trống.</p>
          <Button variant="outline" size="sm" onClick={retry}>
            <RotateCcwIcon aria-hidden="true" />
            Tải lại giờ trống
          </Button>
        </div>
      ) : (
        days.map((day) => <SlotDay key={day.date} day={day} />)
      )}
      <p className="text-xs text-muted-foreground">
        Theo lịch làm việc thực tế của kỹ thuật viên, giờ Việt Nam.
      </p>
    </section>
  );
}

function SlotDay({ day }: { day: NextSlotsDay }) {
  const name = `${day.label} · ${formatLocalDate(day.date)}`;
  return (
    <div role="group" aria-label={name} className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{name}</p>
      {day.times === undefined ? (
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      ) : day.times.length === 0 ? (
        <p className="text-sm text-muted-foreground">Đã kín lịch</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {day.times.map((time) => (
            <ComingSoonButton
              key={time}
              feature="Đặt lịch trực tuyến"
              size="sm"
              variant="outline"
              className="tabular-nums"
            >
              {time}
            </ComingSoonButton>
          ))}
        </div>
      )}
    </div>
  );
}
