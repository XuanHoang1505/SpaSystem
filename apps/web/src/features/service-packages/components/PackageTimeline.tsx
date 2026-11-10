import { Link } from 'react-router-dom';
import { ArrowDownIcon, CalendarDaysIcon, ClockIcon, HourglassIcon, SparklesIcon } from 'lucide-react';
import type { PackageItem } from '@spa/shared-types';
import { ImageWithFallback } from '@/components/shared/ImageWithFallback/ImageWithFallback';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { catalogStatusBadge } from '@/features/services';

/**
 * Trình tự liệu trình dạng các bước chăm sóc tuần tự (SCR-W05). `items` đã được backend sắp theo `sortOrder`.
 */
export function PackageTimeline({ items }: { items: readonly PackageItem[] }) {
  return (
    <div aria-label="Trình tự liệu trình" className="space-y-4">
      {items.map((item, index) => {
        const stepNumber = String(index + 1).padStart(2, '0');
        const nextItem = items[index + 1];
        return (
          <div key={item.spaServiceId} className="space-y-4">
            <div className="group relative flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-2xl border bg-card/80 p-4 sm:p-5 shadow-2xs transition-all hover:bg-card hover:shadow-xs">
              <div className="flex items-center gap-3 shrink-0">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 font-heading text-sm font-bold text-primary ring-1 ring-primary/20">
                  {stepNumber}
                </span>
                <ImageWithFallback
                  src={item.serviceImageUrl}
                  alt=""
                  fallbackIcon={SparklesIcon}
                  className="size-16 sm:size-18 shrink-0 rounded-xl border object-cover shadow-2xs"
                />
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Bước {index + 1}
                    </span>
                    {item.serviceStatus === 'on_sale' ? (
                      <Link
                        to={`/services/${item.spaServiceId}`}
                        className="font-heading text-lg font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
                      >
                        {item.serviceName}
                      </Link>
                    ) : (
                      <span className="font-heading text-lg font-semibold text-foreground">
                        {item.serviceName}
                      </span>
                    )}
                    {item.serviceStatus === 'discontinued' && (
                      <StatusBadge {...catalogStatusBadge.discontinued} status={item.serviceStatus} />
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <CalendarDaysIcon className="size-3.5" aria-hidden="true" />
                    {`${item.sessionCount} buổi thực hiện`}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {item.minDaysBetweenSessions > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary/60 px-2.5 py-1 font-medium text-secondary-foreground">
                      <HourglassIcon className="size-3.5 text-primary" aria-hidden="true" />
                      {`Cách buổi trước tối thiểu ${item.minDaysBetweenSessions} ngày`}
                    </span>
                  )}
                  {item.note && (
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <ClockIcon className="size-3.5" aria-hidden="true" />
                      {item.note}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Subtle connector indicator between steps */}
            {nextItem && (
              <div className="flex items-center justify-center -my-1">
                <div className="inline-flex items-center gap-1.5 rounded-full border bg-muted/60 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-2xs">
                  <ArrowDownIcon className="size-3 text-primary" aria-hidden="true" />
                  {nextItem.minDaysBetweenSessions > 0 ? (
                    <span>Khoảng nghỉ tối thiểu {nextItem.minDaysBetweenSessions} ngày để da tái tạo</span>
                  ) : (
                    <span>Chuyển tiếp bước tiếp theo</span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
