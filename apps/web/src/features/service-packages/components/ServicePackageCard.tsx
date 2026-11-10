import { Link } from 'react-router-dom';
import { CalendarDaysIcon, PackageIcon, SparklesIcon } from 'lucide-react';
import type { PackageListItem } from '@spa/shared-types';
import { Button } from '@/components/ui/button';
import { ImageWithFallback } from '@/components/shared/ImageWithFallback/ImageWithFallback';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { AddToCartButton } from '@/features/orders';
import { catalogStatusBadge } from '@/features/services';
import { formatCurrency, formatLocalDate } from '@/lib/formatting/formatters';
import { savingPercent } from '../coursePlan';

/** Giá mỗi buổi, làm tròn tới nghìn đồng. */
const pricePerSession = (price: number, sessions: number) =>
  Math.round(price / Math.max(sessions, 1) / 1000) * 1000;

export function ServicePackageCard({ pkg }: { pkg: PackageListItem }) {
  const to = `/packages/${pkg.id}`;
  const saving = savingPercent(pkg.price, pkg.retailPrice);
  const savedAmount = pkg.retailPrice > pkg.price ? pkg.retailPrice - pkg.price : 0;
  const sessionCost = pricePerSession(pkg.price, pkg.totalSessions);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:border-primary/40 hover:shadow-md">
      <Link to={to} tabIndex={-1} aria-hidden="true" className="relative block aspect-[16/10] overflow-hidden bg-muted">
        <ImageWithFallback
          src={pkg.imageUrl}
          alt=""
          fallbackIcon={PackageIcon}
          className="size-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
        />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          {pkg.status === 'discontinued' ? (
            <StatusBadge {...catalogStatusBadge.discontinued} status={pkg.status} />
          ) : saving > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-xs">
              Tiết kiệm {saving}%
            </span>
          ) : (
            <span />
          )}

          <span className="inline-flex items-center gap-1.5 rounded-md bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground shadow-xs backdrop-blur-xs">
            <CalendarDaysIcon className="size-3.5 text-primary" aria-hidden="true" />
            {pkg.totalSessions} buổi · {pkg.validityDays} ngày
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary/80 px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
            <SparklesIcon className="size-3 text-primary" aria-hidden="true" />
            Chỉ ~{formatCurrency(sessionCost)}/buổi
          </span>
          {savedAmount > 0 && (
            <span className="text-[11px] font-medium text-muted-foreground">
              Tiết kiệm {formatCurrency(savedAmount)}
            </span>
          )}
        </div>

        <h3 className="line-clamp-2 font-heading text-lg font-semibold tracking-tight text-foreground" title={pkg.name}>
          <Link
            to={to}
            className="rounded-sm outline-none transition-colors hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {pkg.name}
          </Link>
        </h3>

        {pkg.shortDescription && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {pkg.shortDescription}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 border-t pt-3">
          <div>
            <span className="block text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Giá trọn gói
            </span>
            {pkg.retailPrice > pkg.price && (
              <span className="text-xs text-muted-foreground line-through">
                {formatCurrency(pkg.retailPrice)}
              </span>
            )}
          </div>
          <div className="text-right">
            <span className="font-heading text-2xl font-bold text-primary">
              {formatCurrency(pkg.price)}
            </span>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            asChild
            variant="outline"
            className="flex-1 font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Link to={to} aria-label={`Xem chi tiết ${pkg.name}`}>
              Chi tiết
            </Link>
          </Button>
          {pkg.status === 'on_sale' && (
            <AddToCartButton
              product={{ type: 'package', id: pkg.id }}
              iconOnly
              productName={pkg.name}
            />
          )}
        </div>

        {pkg.saleEndDate && (
          <p className="text-center text-[11px] text-muted-foreground">
            Mở bán đến {formatLocalDate(pkg.saleEndDate)}
          </p>
        )}
      </div>
    </article>
  );
}
