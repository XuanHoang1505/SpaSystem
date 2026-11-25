import { Link } from 'react-router-dom';
import { CalendarDaysIcon, HourglassIcon, InfoIcon, SparklesIcon } from 'lucide-react';
import type { PackageItem } from '@spa/shared-types';
import { ImageWithFallback } from '@/components/shared/ImageWithFallback/ImageWithFallback';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { catalogStatusBadge } from '@/features/services';
import { cn } from '@/lib/utils';

/**
 * Trình tự liệu trình (SCR-W05): các dịch vụ theo thứ tự thực hiện trên một đường dọc, mỗi dịch vụ kèm số buổi và
 * khoảng nghỉ tối thiểu trước mỗi buổi của nó (BR-BKG-05). `items` đã được backend sắp theo `sortOrder`.
 */
export function PackageTimeline({ items }: { items: readonly PackageItem[] }) {
  return (
    <ol aria-label="Trình tự liệu trình">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <li key={item.spaServiceId} className="relative flex gap-3 pb-5 last:pb-0 sm:gap-4">
            {!last && (
              <span
                aria-hidden="true"
                className="absolute top-11 bottom-1 left-4 w-px bg-border sm:top-12 sm:left-5"
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                'relative mt-3 grid size-8 shrink-0 place-items-center rounded-full font-heading text-sm font-semibold sm:size-10',
                index === 0
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-primary/10 text-primary ring-1 ring-primary/20',
              )}
            >
              {index + 1}
            </span>

            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border bg-background/60 p-3 sm:p-4">
              <ImageWithFallback
                src={item.serviceImageUrl}
                alt=""
                fallbackIcon={SparklesIcon}
                className="size-12 shrink-0 rounded-xl object-cover sm:size-18"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {item.serviceStatus === 'on_sale' ? (
                    <Link
                      to={`/services/${item.spaServiceId}`}
                      className="font-heading text-base leading-snug font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline sm:text-lg"
                    >
                      {item.serviceName}
                    </Link>
                  ) : (
                    <span className="font-heading text-base leading-snug font-semibold text-foreground sm:text-lg">
                      {item.serviceName}
                    </span>
                  )}
                  {item.serviceStatus === 'discontinued' && (
                    <StatusBadge {...catalogStatusBadge.discontinued} status={item.serviceStatus} />
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">
                    <CalendarDaysIcon className="size-3.5" aria-hidden="true" />
                    {item.sessionCount} buổi
                  </span>
                  {item.minDaysBetweenSessions > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">
                      <HourglassIcon className="size-3.5 text-primary" aria-hidden="true" />
                      Mỗi buổi cách buổi trước ít nhất {item.minDaysBetweenSessions} ngày
                    </span>
                  )}
                </div>
                {item.note && (
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <InfoIcon className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                    {item.note}
                  </p>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
