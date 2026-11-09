import {
  CalendarCheckIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  CreditCardIcon,
  FlowerIcon,
  PackageIcon,
} from 'lucide-react';
import type { PackageDetail } from '@spa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DecorativeShapes } from '@/components/shared/DecorativeShapes/DecorativeShapes';
import { ImageWithFallback } from '@/components/shared/ImageWithFallback/ImageWithFallback';
import { InfoTile } from '@/components/shared/InfoTile/InfoTile';
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
              <div className="relative">
                <DecorativeShapes />
                <ImageWithFallback
                  src={pkg.imageUrl}
                  alt={pkg.name}
                  fallbackIcon={PackageIcon}
                  className="relative aspect-[16/9] w-full rounded-2xl border"
                />
              </div>
              <div className="space-y-4">
                {pkg.status === 'discontinued' && (
                  <StatusBadge {...catalogStatusBadge.discontinued} status={pkg.status} />
                )}
                <h1 className="text-3xl tracking-tight sm:text-4xl">{pkg.name}</h1>
                {pkg.shortDescription && (
                  <p className="text-lg text-muted-foreground">{pkg.shortDescription}</p>
                )}
                <div className="grid grid-cols-3 gap-3">
                  <InfoTile
                    layout="stacked"
                    tone="accent"
                    icon={CalendarCheckIcon}
                    label="Tổng số buổi"
                    value={pkg.totalSessions}
                  />
                  <InfoTile
                    layout="stacked"
                    tone="secondary"
                    icon={ClockIcon}
                    label="Thời hạn sử dụng"
                    value={`${pkg.validityDays} ngày`}
                  />
                  <InfoTile
                    layout="stacked"
                    tone="success"
                    icon={FlowerIcon}
                    label="Số dịch vụ"
                    value={pkg.items.length}
                  />
                </div>
              </div>

              <Card>
                <CardContent className="space-y-3">
                  <h2 className="text-2xl">Giới thiệu</h2>
                  <p className="whitespace-pre-line text-muted-foreground">
                    {pkg.description ?? 'Chưa có mô tả cho gói này.'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-2xl">Trình tự liệu trình</h2>
                    <span className="text-xs font-medium text-muted-foreground">
                      {pkg.totalSessions} buổi · {pkg.items.length} dịch vụ
                    </span>
                  </div>
                  <PackageTimeline items={pkg.items} />
                </CardContent>
              </Card>

              <PackageUsageSteps />
            </div>

            <aside aria-label="Giá và đăng ký gói" className="lg:sticky lg:top-24">
              <div className="space-y-5 rounded-xl border bg-card p-6 shadow-sm">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Chi phí trọn gói {pkg.totalSessions} buổi
                  </p>
                  {saving > 0 && (
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span className="line-through">{formatCurrency(pkg.retailPrice)}</span>
                      <Badge variant="secondary">{`Tiết kiệm ${saving}%`}</Badge>
                    </p>
                  )}
                  <p className="font-heading text-4xl font-semibold text-primary">
                    {formatCurrency(pkg.price)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {`~${formatCurrency(pricePerSession(pkg.price, pkg.totalSessions))}/buổi`}
                  </p>
                  {saleText && (
                    <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarIcon className="size-4" aria-hidden="true" />
                      {saleText}
                    </p>
                  )}
                </div>
                <div className="rounded-lg border bg-muted/60 p-4 text-sm">
                  <p className="flex items-center gap-2 font-medium">
                    <ClockIcon className="size-4 text-primary" aria-hidden="true" />
                    Thời hạn sử dụng gói
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Dùng trong {pkg.validityDays} ngày kể từ ngày thanh toán.
                  </p>
                  {finish && (
                    <p className="mt-1 text-muted-foreground">{`Hoàn thành sớm nhất sau ${finish}`}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Đặc quyền kèm gói</p>
                  <ul className="space-y-2">
                    {placeholderPackagePerks.map((perk) => (
                      <li
                        key={perk}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <CheckCircle2Icon
                          className="mt-0.5 size-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        {perk}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="grid gap-2">
                  <BuyNowButton packageId={pkg.id} />
                  <AddToCartButton product={{ type: 'package', id: pkg.id }} />
                </div>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CreditCardIcon className="size-4" aria-hidden="true" />
                  Thanh toán trực tuyến qua VNPay
                </p>
              </div>
            </aside>
          </div>

          <RelatedPackages excludeId={pkg.id} />
          <CatalogFaq kind="package" />
          <CatalogTrustStrip />
        </article>
      )}
    </CatalogDetailStates>
  );
}
