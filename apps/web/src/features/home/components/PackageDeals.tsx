import { Link } from 'react-router-dom';
import { ArrowUpRightIcon, PackageIcon } from 'lucide-react';
import type { PackageListItem } from '@spa/shared-types';
import { ImageWithFallback } from '@/components/shared/ImageWithFallback/ImageWithFallback';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { savingPercent, usePackageSearch } from '@/features/service-packages';
import { formatCurrency } from '@/lib/formatting/formatters';
import { demoPhotoFor } from '../homeDemoContent';
import { HomeSection } from './HomeSection';

const photoOf = (pkg: PackageListItem, index: number) =>
  pkg.imageUrl || demoPhotoFor(pkg.name, index + 2);

/** Price, the struck-through price of the sessions bought one by one, and the real saving (`retailPrice`). */
function PackagePrice({ pkg, large }: { pkg: PackageListItem; large?: boolean }) {
  const saving = savingPercent(pkg.price, pkg.retailPrice);
  return (
    <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span
        className={large ? 'font-heading text-3xl text-foreground' : 'font-medium text-foreground'}
      >
        {formatCurrency(pkg.price)}
      </span>
      {saving > 0 && (
        <>
          <span className="text-sm text-muted-foreground line-through">
            {formatCurrency(pkg.retailPrice)}
          </span>
          <span className="text-sm font-medium text-chart-5">Tiết kiệm {saving}%</span>
        </>
      )}
    </p>
  );
}

/** One featured package as a large feature, the next two as compact rows beside it. */
export function PackageDeals() {
  const query = usePackageSearch({ pageNumber: 1, pageSize: 3, status: 'on_sale' });
  const [featured, ...others] = query.data?.items ?? [];

  return (
    <HomeSection
      id="home-packages"
      badge="Ưu đãi liệu trình"
      title="Liệu trình theo gói, giá tốt hơn"
      description="Nhiều buổi liên tục cho kết quả bền hơn, chi phí mỗi buổi thấp hơn mua lẻ."
      seeAllTo="/packages"
      seeAllLabel="Tất cả gói"
    >
      {query.isPending ? (
        <div className="grid gap-6 lg:grid-cols-[7fr_5fr]" aria-label="Đang tải gói liệu trình">
          <Skeleton className="h-[460px] rounded-sm" />
          <div className="grid gap-6">
            <Skeleton className="rounded-sm" />
            <Skeleton className="rounded-sm" />
          </div>
        </div>
      ) : query.isError ? (
        <div className="flex items-center justify-between gap-3 rounded-sm border border-dashed p-6 text-sm text-muted-foreground">
          Không tải được gói liệu trình.
          <Button size="sm" variant="outline" onClick={() => void query.refetch()}>
            Thử lại
          </Button>
        </div>
      ) : !featured ? (
        <p className="rounded-sm border border-dashed p-6 text-sm text-muted-foreground">
          Chưa có gói liệu trình đang mở bán.
        </p>
      ) : (
        <div className={others.length > 0 ? 'grid gap-6 lg:grid-cols-[7fr_5fr]' : 'grid'}>
          <Link
            to={`/packages/${featured.id}`}
            className="group grid overflow-hidden rounded-sm border bg-card transition-colors outline-none hover:border-primary/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-[1.1fr_1fr]"
          >
            <ImageWithFallback
              src={photoOf(featured, 0)}
              alt=""
              fallbackIcon={PackageIcon}
              className="aspect-[4/3] size-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.03] sm:aspect-auto lg:aspect-[16/9] xl:aspect-auto"
            />
            <span className="flex flex-col gap-4 p-6 md:p-8">
              <span className="font-heading text-2xl leading-tight md:text-3xl">
                {featured.name}
              </span>
              {featured.shortDescription && (
                <span className="text-muted-foreground">{featured.shortDescription}</span>
              )}
              <span className="text-sm text-muted-foreground">
                {featured.totalSessions} buổi, dùng trong {featured.validityDays} ngày
              </span>
              <span className="mt-auto space-y-4 pt-2">
                <PackagePrice pkg={featured} large />
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  Xem chi tiết gói
                  <ArrowUpRightIcon className="size-4" aria-hidden="true" />
                </span>
              </span>
            </span>
          </Link>

          {others.length > 0 && (
            <ul className="grid gap-6">
              {others.map((pkg, index) => (
                <li key={pkg.id}>
                  <Link
                    to={`/packages/${pkg.id}`}
                    className="group flex h-full gap-5 rounded-sm border bg-card p-4 transition-colors outline-none hover:border-primary/40 focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <ImageWithFallback
                      src={photoOf(pkg, index + 1)}
                      alt=""
                      fallbackIcon={PackageIcon}
                      className="w-28 shrink-0 rounded-sm object-cover sm:w-36"
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-2 py-1">
                      <span className="font-heading text-xl leading-snug">{pkg.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {pkg.totalSessions} buổi, dùng trong {pkg.validityDays} ngày
                      </span>
                      <span className="mt-auto">
                        <PackagePrice pkg={pkg} />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </HomeSection>
  );
}
