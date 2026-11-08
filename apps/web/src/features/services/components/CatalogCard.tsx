import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import type { CatalogStatus } from '@spa/shared-types';
import { ImageWithFallback } from '@/components/shared/ImageWithFallback/ImageWithFallback';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { formatCurrency } from '@/lib/formatting/formatters';
import { catalogStatusBadge } from '../catalogStatus';

/**
 * Thẻ gói (mẫu Stitch SCR-W04): ảnh lớn, badge "Ngừng bán" góc phải, tên 2 dòng, dòng thông tin,
 * giá đậm, chú thích; cả thẻ là một link.
 */
export function CatalogCard({
  to,
  name,
  imageUrl,
  fallbackIcon,
  status,
  meta,
  price,
  footnote,
  description,
}: {
  to: string;
  name: string;
  imageUrl: string | null;
  fallbackIcon: LucideIcon;
  status: CatalogStatus;
  meta: ReactNode;
  price: number;
  footnote?: string;
  /** Mô tả ngắn (Q-71), 2 dòng; ẩn khi không có. */
  description?: string | null;
}) {
  return (
    <article className="h-full">
      <Link
        to={to}
        className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-colors outline-none hover:border-primary/40 focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <ImageWithFallback
            src={imageUrl}
            alt={name}
            fallbackIcon={fallbackIcon}
            className="size-full transition-transform duration-300 motion-safe:group-hover:scale-105"
          />
          {status === 'discontinued' && (
            <StatusBadge
              {...catalogStatusBadge.discontinued}
              status={status}
              className="absolute top-3 right-3"
            />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <h3 className="line-clamp-2 text-xl leading-snug" title={name}>
            {name}
          </h3>
          <p className="text-xs text-muted-foreground">{meta}</p>
          {description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>
          )}
          <p className="mt-auto pt-3 font-heading text-xl font-semibold text-primary">
            {formatCurrency(price)}
          </p>
          {footnote && <p className="text-xs text-muted-foreground">{footnote}</p>}
        </div>
      </Link>
    </article>
  );
}
