import { Link } from 'react-router-dom';
import { ClockIcon, SparklesIcon, StarIcon } from 'lucide-react';
import type { ServiceListItem } from '@spa/shared-types';
import { Button } from '@/components/ui/button';
import { BookServiceButton } from '@/features/bookings/components/BookServiceButton';
import { AddToCartButton } from '@/features/orders';
import { ImageWithFallback } from '@/components/shared/ImageWithFallback/ImageWithFallback';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { formatCurrency, formatDuration } from '@/lib/formatting/formatters';
import { formatRating, placeholderRating } from '../catalogPlaceholders';
import { catalogStatusBadge } from '../catalogStatus';

/** Thẻ dịch vụ SCR-W02 (mẫu Stitch). Mô tả ngắn từ `shortDescription` (Q-71); ★ vẫn là dữ liệu tạm. */
export function ServiceCard({ service }: { service: ServiceListItem }) {
  const to = `/services/${service.id}`;
  const rating = placeholderRating(service.id);
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/40">
      <Link to={to} tabIndex={-1} aria-hidden="true" className="relative block aspect-[16/10]">
        <ImageWithFallback
          src={service.imageUrl}
          alt=""
          fallbackIcon={SparklesIcon}
          className="size-full transition-transform duration-300 motion-safe:group-hover:scale-105"
        />
        <span className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            {service.category}
          </span>
          {service.status === 'discontinued' && (
            <StatusBadge {...catalogStatusBadge.discontinued} status={service.status} />
          )}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ClockIcon className="size-3.5" aria-hidden="true" />
            {formatDuration(service.durationMinutes)}
          </span>
          <span className="flex items-center gap-1">
            <StarIcon
              className="size-3.5 fill-current text-status-warning-foreground"
              aria-hidden="true"
            />
            <span className="font-medium text-foreground">{formatRating(rating.score)}</span>(
            {rating.count})
          </span>
        </div>
        <h3
          className="truncate font-heading text-lg font-semibold tracking-tight"
          title={service.name}
        >
          <Link
            to={to}
            className="rounded-sm transition-colors outline-none hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {service.name}
          </Link>
        </h3>
        {service.shortDescription && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {service.shortDescription}
          </p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 border-t pt-3">
          <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Chi phí
          </span>
          <span className="font-heading text-xl font-semibold text-primary">
            {formatCurrency(service.price)}
          </span>
        </div>
        <div className="flex gap-2 pt-1">
          <Button
            asChild
            variant="outline"
            className="flex-1 font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Link to={to} aria-label={`Xem chi tiết ${service.name}`}>
              Chi tiết
            </Link>
          </Button>
          {service.status === 'on_sale' && (
            <BookServiceButton
              serviceId={service.id}
              className="flex-1 font-medium shadow-xs hover:shadow-sm"
              aria-label={`Đặt lịch ${service.name}`}
            >
              Đặt lịch
            </BookServiceButton>
          )}
          {service.status === 'on_sale' && (
            <AddToCartButton
              product={{ type: 'service', id: service.id }}
              iconOnly
              productName={service.name}
            />
          )}
        </div>
      </div>
    </article>
  );
}
