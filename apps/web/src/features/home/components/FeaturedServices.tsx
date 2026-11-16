import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRightIcon, SparklesIcon, StarIcon } from 'lucide-react';
import type { ServiceListItem } from '@spa/shared-types';
import { ImageWithFallback } from '@/components/shared/ImageWithFallback/ImageWithFallback';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useServiceSearch } from '@/features/services';
import { formatCurrency, formatDuration } from '@/lib/formatting/formatters';
import { cn } from '@/lib/utils';
import { demoPhotoFor } from '../homeDemoContent';
import { HomeSection } from './HomeSection';

const photoOf = (service: ServiceListItem, index: number) =>
  service.imageUrl || demoPhotoFor(service.name, index);

/**
 * Services as an editorial list: a large photo on the left follows the service under the pointer or keyboard focus,
 * the list on the right carries name, length and price. On phones the photo shrinks into each row.
 */
export function FeaturedServices() {
  const query = useServiceSearch({ pageNumber: 1, pageSize: 5, status: 'on_sale' });
  const services = query.data?.items ?? [];
  const [active, setActive] = useState(0);

  return (
    <HomeSection
      id="home-services"
      title="Dịch vụ nổi bật"
      description="Những liệu pháp được chọn nhiều tại spa, đặt lịch theo giờ bạn muốn."
      seeAllTo="/services"
      tone="band"
    >
      {query.isPending ? (
        <div className="grid gap-10 md:grid-cols-[5fr_7fr]" aria-label="Đang tải dịch vụ">
          <Skeleton className="hidden aspect-[4/5] rounded-sm md:block" />
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-20 rounded-sm" />
            ))}
          </div>
        </div>
      ) : query.isError ? (
        <div className="flex items-center justify-between gap-3 rounded-sm border border-dashed p-6 text-sm text-muted-foreground">
          Không tải được dịch vụ.
          <Button size="sm" variant="outline" onClick={() => void query.refetch()}>
            Thử lại
          </Button>
        </div>
      ) : services.length === 0 ? (
        <p className="rounded-sm border border-dashed p-6 text-sm text-muted-foreground">
          Chưa có dịch vụ đang mở bán.
        </p>
      ) : (
        <div className="grid items-start gap-10 md:grid-cols-[5fr_7fr]">
          {/* Large photo: every image is stacked and only the active one is visible, so switching never reloads. */}
          <div
            aria-hidden="true"
            className="relative hidden aspect-[4/5] overflow-hidden rounded-sm bg-muted md:sticky md:top-24 md:block"
          >
            {services.map((service, index) => (
              <ImageWithFallback
                key={service.id}
                src={photoOf(service, index)}
                alt=""
                fallbackIcon={SparklesIcon}
                className={cn(
                  'absolute inset-0 size-full object-cover transition-opacity duration-500',
                  index === active ? 'opacity-100' : 'opacity-0',
                )}
              />
            ))}
          </div>

          <ol className="divide-y border-y">
            {services.map((service, index) => (
              <li key={service.id}>
                <Link
                  to={`/services/${service.id}`}
                  onMouseEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  className={cn(
                    'group flex items-center gap-4 py-5 transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 md:gap-6 md:py-6',
                    index === active && 'md:text-primary',
                  )}
                >
                  <ImageWithFallback
                    src={photoOf(service, index)}
                    alt=""
                    fallbackIcon={SparklesIcon}
                    className="size-16 shrink-0 rounded-sm object-cover md:hidden"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-heading text-xl leading-snug md:text-2xl">
                      {service.name}
                    </span>
                    {service.reviewCount > 0 && service.averageRating !== null && (
                      <span className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <StarIcon
                          className="size-3.5 fill-chart-3 text-chart-3"
                          aria-hidden="true"
                        />
                        <span className="font-medium text-foreground">
                          {service.averageRating.toFixed(1).replace('.', ',')}
                        </span>
                        ({service.reviewCount} đánh giá)
                      </span>
                    )}
                    {service.shortDescription && (
                      <span className="mt-1 line-clamp-1 block text-sm text-muted-foreground">
                        {service.shortDescription}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-medium text-foreground">
                      {formatCurrency(service.price)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(service.durationMinutes)}
                    </span>
                  </span>
                  <ArrowUpRightIcon
                    className="hidden size-5 shrink-0 text-muted-foreground transition-all group-hover:text-primary motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5 sm:block"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}
    </HomeSection>
  );
}
