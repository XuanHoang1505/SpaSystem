import { Link } from 'react-router-dom';
import { HourglassIcon, SparklesIcon } from 'lucide-react';
import type { PackageItem } from '@spa/shared-types';
import { ImageWithFallback } from '@/components/shared/ImageWithFallback/ImageWithFallback';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { catalogStatusBadge } from '@/features/services';

/**
 * Trình tự liệu trình dạng timeline dọc gọn (mẫu Stitch SCR-W05). `items` đã được backend sắp theo
 * `sortOrder`. Dịch vụ ngừng bán không có link (khách mở sẽ gặp 404).
 */
export function PackageTimeline({ items }: { items: readonly PackageItem[] }) {
  return (
    <ol aria-label="Trình tự liệu trình" className="relative space-y-5">
      <span
        aria-hidden="true"
        className="absolute top-3 bottom-3 left-3 w-0.5 -translate-x-1/2 bg-primary/30"
      />
      {items.map((item, index) => (
        <li key={item.spaServiceId} className="relative flex items-start gap-3">
          <span className="z-10 grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {index + 1}
          </span>
          <ImageWithFallback
            src={item.serviceImageUrl}
            alt=""
            fallbackIcon={SparklesIcon}
            className="size-9 shrink-0 rounded-md border"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {item.serviceStatus === 'on_sale' ? (
                <Link
                  to={`/services/${item.spaServiceId}`}
                  className="font-heading text-primary underline-offset-4 hover:underline"
                >
                  {item.serviceName}
                </Link>
              ) : (
                <span className="font-heading">{item.serviceName}</span>
              )}
              {item.serviceStatus === 'discontinued' && (
                <StatusBadge {...catalogStatusBadge.discontinued} status={item.serviceStatus} />
              )}
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                {`${item.sessionCount} buổi`}
              </span>
            </div>
            {item.minDaysBetweenSessions > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <HourglassIcon className="size-3.5" aria-hidden="true" />
                {`Cách buổi trước tối thiểu ${item.minDaysBetweenSessions} ngày`}
              </p>
            )}
            {item.note && <p className="text-xs text-muted-foreground italic">{item.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
