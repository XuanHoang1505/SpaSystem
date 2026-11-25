import {
  CalendarCheckIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  CreditCardIcon,
  FlowerIcon,
  PackageIcon,
  SparklesIcon,
  StarIcon,
  type LucideIcon,
} from 'lucide-react';
import type { PackageDetail } from '@spa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ImageWithFallback } from '@/components/shared/ImageWithFallback/ImageWithFallback';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import {
  CatalogBreadcrumb,
  CatalogDetailStates,
  CatalogFaq,
  CatalogTrustStrip,
  catalogStatusBadge,
  placeholderPackagePerks,
} from '@/features/services';
import { AddToCartButton, BuyNowButton } from '@/features/orders';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatCurrency, formatLocalDate } from '@/lib/formatting/formatters';
import { minCourseDays, savingPercent } from '../coursePlan';
import { usePackage } from '../hooks/usePackage';
import { PackageTimeline } from './PackageTimeline';
import { PackageUsageSteps } from './PackageUsageSteps';
import { RelatedPackages } from './RelatedPackages';
import { ProductReviewsSection } from '@/features/reviews';

/** "Mở bán từ …", "Mở bán đến …" hoặc "Mở bán … – …"; không có ngày nào → undefined (ẩn dòng). */
function saleWindow({ saleStartDate, saleEndDate }: PackageDetail) {
  if (saleStartDate && saleEndDate)
    return `Mở bán ${formatLocalDate(saleStartDate)} – ${formatLocalDate(saleEndDate)}`;
  if (saleStartDate) return `Mở bán từ ${formatLocalDate(saleStartDate)}`;
  if (saleEndDate) return `Mở bán đến ${formatLocalDate(saleEndDate)}`;
  return undefined;
}

/** "~N ngày" dưới 2 tuần, còn lại "~N tuần"; 0 ngày → undefined (ẩn dòng). */
function courseLength(days: number) {
  if (days <= 0) return undefined;
  return days < 14 ? `~${days} ngày` : `~${Math.round(days / 7)} tuần`;
}

/** Giá mỗi buổi, làm tròn tới nghìn đồng. */
const pricePerSession = (price: number, sessions: number) =>
  Math.round(price / Math.max(sessions, 1) / 1000) * 1000;

/** A short description that only repeats the name (e.g. "Chăm sóc da kèm lấy nhân mụn.") adds nothing under the title. */
function addsToName(name: string, text: string | null) {
  if (!text) return false;
  const plain = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  return !plain(name).includes(plain(text));
}

/**
 * SCR-W05 — Chi tiết gói dịch vụ (UC-SPA-07), theo mẫu Stitch chi tiết gói. Đặc quyền và các nút
 * mua là nội dung tạm (catalogPlaceholders, ComingSoonButton).
 */
export function PackageDetailView({ packageId }: { packageId: string }) {
  const query = usePackage(packageId);
  const pkg = query.data;
  useDocumentTitle(pkg?.name);
  const saleText = pkg && saleWindow(pkg);
  const saving = pkg ? savingPercent(pkg.price, pkg.retailPrice) : 0;
  const finish = pkg && courseLength(minCourseDays(pkg.items));

  return (
    <CatalogDetailStates
      query={query}
      notFoundTitle="Không tìm thấy gói dịch vụ"
      notFoundDescription="Gói không tồn tại, đã ngừng bán hoặc ngoài thời gian mở bán."
      backTo="/packages"
      backLabel="Xem tất cả gói"
    >
      {pkg && (
        <article className="space-y-12">
          <div className="-mx-4 -mt-8 border-b bg-muted/60 px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <CatalogBreadcrumb parentLabel="Gói dịch vụ" parentTo="/packages" current={pkg.name} />
          </div>

          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
            <div className="space-y-8">
              <div className="relative overflow-hidden rounded-3xl border bg-muted/30">
                <ImageWithFallback
                  src={pkg.imageUrl}
                  alt={pkg.name}
                  fallbackIcon={PackageIcon}
                  className="aspect-[16/9] w-full object-cover"
                />
                {saving > 0 && (
                  <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-md">
                    <SparklesIcon className="size-3.5" aria-hidden="true" />
                    <span>{`Tiết kiệm ${saving}% so với mua lẻ`}</span>
                  </div>
                )}
              </div>

              <Card className="gap-0 rounded-2xl py-0">
                <CardContent className="space-y-6 p-6 sm:p-7">
                  <header className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="font-medium">
                        Gói liệu trình
                      </Badge>
                      {pkg.status === 'discontinued' && (
                        <StatusBadge {...catalogStatusBadge.discontinued} status={pkg.status} />
                      )}
                    </div>
                    <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                      {pkg.name}
                    </h1>
                    {pkg.reviewCount > 0 && pkg.averageRating !== null && (
                      <a
                        href="#danh-gia"
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <StarIcon
                          className="size-4 fill-amber-400 text-amber-400"
                          aria-hidden="true"
                        />
                        <span className="font-medium text-foreground">
                          {pkg.averageRating.toFixed(1)}
                        </span>
                        <span>({pkg.reviewCount} đánh giá)</span>
                      </a>
                    )}
                    {addsToName(pkg.name, pkg.shortDescription) && (
                      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                        {pkg.shortDescription}
                      </p>
                    )}
                  </header>

                  <dl className="grid grid-cols-3 divide-x rounded-xl bg-muted/50 py-4">
                    <PackageFact
                      icon={CalendarCheckIcon}
                      value={pkg.totalSessions}
                      label="buổi chăm sóc"
                    />
                    <PackageFact icon={ClockIcon} value={pkg.validityDays} label="ngày sử dụng" />
                    <PackageFact icon={FlowerIcon} value={pkg.items.length} label="dịch vụ" />
                  </dl>

                  {pkg.description && (
                    <section className="space-y-2 border-t pt-6">
                      <h2 className="font-heading text-xl font-semibold text-foreground">
                        Giới thiệu gói
                      </h2>
                      <p className="leading-relaxed whitespace-pre-line text-muted-foreground">
                        {pkg.description}
                      </p>
                    </section>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl py-0">
                <CardContent className="space-y-6 p-6 sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h2 className="font-heading text-xl font-semibold text-foreground">
                        Trình tự liệu trình
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Các buổi được đặt lịch lần lượt theo thứ tự dưới đây.
                      </p>
                    </div>
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                      {pkg.totalSessions} buổi · {pkg.items.length} dịch vụ
                    </span>
                  </div>
                  <PackageTimeline items={pkg.items} />
                </CardContent>
              </Card>

              <PackageUsageSteps />
            </div>

            <aside aria-label="Giá và đăng ký gói" className="lg:sticky lg:top-28">
              <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                <div className="border-b bg-muted/40 p-5 sm:p-6">
                  <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Chi phí trọn gói {pkg.totalSessions} buổi
                  </p>
                  {saving > 0 && (
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted-foreground line-through">
                        {formatCurrency(pkg.retailPrice)}
                      </span>
                      <Badge variant="secondary" className="font-semibold text-primary">
                        {`Tiết kiệm ${saving}%`}
                      </Badge>
                    </div>
                  )}
                  <p className="mt-1 font-heading text-3xl font-bold text-primary sm:text-4xl">
                    {formatCurrency(pkg.price)}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-secondary/60 px-3 py-1 text-xs font-semibold text-secondary-foreground">
                    <SparklesIcon className="size-3 text-primary" aria-hidden="true" />
                    <span>{`Chỉ ~${formatCurrency(pricePerSession(pkg.price, pkg.totalSessions))}/buổi`}</span>
                  </div>
                  {saleText && (
                    <p className="mt-2.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarIcon className="size-3.5 text-primary" aria-hidden="true" />
                      {saleText}
                    </p>
                  )}
                </div>

                <div className="space-y-5 p-5 sm:p-6">
                  <div className="space-y-2.5">
                    <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      Thời hạn sử dụng gói
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2.5 text-xs text-muted-foreground">
                        <CheckCircle2Icon
                          className="mt-0.5 size-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        <span>
                          Dùng trong {pkg.validityDays} ngày kể từ ngày kích hoạt thanh toán
                        </span>
                      </li>
                      {finish && (
                        <li className="flex items-start gap-2.5 text-xs text-muted-foreground">
                          <CheckCircle2Icon
                            className="mt-0.5 size-4 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                          <span>{`Hoàn thành sớm nhất sau ${finish}`}</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      Đặc quyền kèm gói
                    </p>
                    <ul className="space-y-2">
                      {placeholderPackagePerks.map((perk) => (
                        <li
                          key={perk}
                          className="flex items-start gap-2.5 text-xs text-muted-foreground"
                        >
                          <CheckCircle2Icon
                            className="mt-0.5 size-4 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid gap-2.5 pt-2">
                    <BuyNowButton packageId={pkg.id} />
                    <AddToCartButton
                      product={{ type: 'package', id: pkg.id }}
                      productName={pkg.name}
                    />
                  </div>

                  <div className="space-y-2 border-t pt-4 text-[11px] text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <CreditCardIcon className="size-3.5 text-primary" aria-hidden="true" />
                      Thanh toán an toàn qua cổng VNPay
                    </p>
                    <p className="flex items-center gap-2">
                      <CalendarCheckIcon className="size-3.5 text-primary" aria-hidden="true" />
                      Hỗ trợ đổi lịch hẹn miễn phí trước 24 giờ
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <div id="danh-gia" className="scroll-mt-28">
            <ProductReviewsSection productId={pkg.id} productType="package" />
          </div>

          <RelatedPackages excludeId={pkg.id} />
          <CatalogFaq kind="package" />
          <CatalogTrustStrip />
        </article>
      )}
    </CatalogDetailStates>
  );
}

/** One number of the package (sessions, days, services) in the summary strip: icon beside the value from `sm`, stacked on a phone. */
function PackageFact({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-2 text-center sm:flex-row sm:justify-center sm:gap-3 sm:text-left">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-card text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="flex flex-col-reverse">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="font-heading text-2xl leading-tight font-semibold text-foreground">
          {value}
        </dd>
      </div>
    </div>
  );
}
