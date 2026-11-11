import {
  BanknoteIcon,
  PackageIcon,
  ShoppingBagIcon,
  SparklesIcon,
  TrendingUpIcon,
} from 'lucide-react';
import type { RevenueReportDto } from '@spa/shared-types';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/formatting/formatters';
import { formatSharePercent, productTypeLabels } from '../../formatters';

export interface RevenueSummaryCardsProps {
  readonly report?: RevenueReportDto | null;
  readonly isLoading?: boolean;
}

export function RevenueSummaryCards({ report, isLoading }: RevenueSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="rounded-xl border border-border/70 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-10 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-4 w-28 rounded-full" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const total = report?.totalRevenue ?? 0;
  const service = report?.serviceRevenue ?? 0;
  const pkg = report?.packageRevenue ?? 0;
  const orders = report?.orderCount ?? 0;
  const productType = report?.productType ?? 'all';

  const serviceShare = total > 0 ? (service / total) * 100 : 0;
  const packageShare = total > 0 ? (pkg / total) * 100 : 0;
  const avgOrderValue = orders > 0 ? total / orders : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Revenue */}
      <Card className="group relative overflow-hidden rounded-xl border border-border/70 bg-card p-5 shadow-xs transition-all duration-200 hover:border-primary/40 hover:shadow-md">
        <div className="absolute -top-4 -right-4 size-24 rounded-full bg-primary/5 transition-transform duration-300 group-hover:scale-125" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Tổng doanh thu
            </span>
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-2xs">
              <BanknoteIcon className="size-5" />
            </div>
          </div>

          <div className="text-2.5xl mt-3 font-heading font-bold tracking-tight text-foreground">
            {formatCurrency(total)}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary/80 px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              <TrendingUpIcon className="size-3 text-primary" />
              {productTypeLabels[productType]}
            </span>
            <span className="text-2xs text-muted-foreground">Đã thực thu</span>
          </div>
        </div>
      </Card>

      {/* Services Revenue */}
      <Card className="group relative overflow-hidden rounded-xl border border-border/70 bg-card p-5 shadow-xs transition-all duration-200 hover:border-chart-1/40 hover:shadow-md">
        <div className="absolute -top-4 -right-4 size-24 rounded-full bg-chart-1/5 transition-transform duration-300 group-hover:scale-125" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Dịch vụ lẻ
            </span>
            <div className="flex size-10 items-center justify-center rounded-xl bg-chart-1/10 text-chart-1 shadow-2xs">
              <SparklesIcon className="size-5" />
            </div>
          </div>

          <div className="text-2.5xl mt-3 font-heading font-bold tracking-tight text-foreground">
            {formatCurrency(service)}
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Tỷ trọng</span>
              <span className="text-2xs inline-flex items-center rounded-full bg-chart-1/10 px-2 py-0.5 font-bold text-chart-1">
                {formatSharePercent(serviceShare)}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-chart-1 transition-all duration-500"
                style={{ width: `${serviceShare}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Packages Revenue */}
      <Card className="group relative overflow-hidden rounded-xl border border-border/70 bg-card p-5 shadow-xs transition-all duration-200 hover:border-chart-2/40 hover:shadow-md">
        <div className="absolute -top-4 -right-4 size-24 rounded-full bg-chart-2/5 transition-transform duration-300 group-hover:scale-125" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Gói dịch vụ
            </span>
            <div className="flex size-10 items-center justify-center rounded-xl bg-chart-2/10 text-chart-2 shadow-2xs">
              <PackageIcon className="size-5" />
            </div>
          </div>

          <div className="text-2.5xl mt-3 font-heading font-bold tracking-tight text-foreground">
            {formatCurrency(pkg)}
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Tỷ trọng</span>
              <span className="text-2xs inline-flex items-center rounded-full bg-chart-2/10 px-2 py-0.5 font-bold text-chart-2">
                {formatSharePercent(packageShare)}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-chart-2 transition-all duration-500"
                style={{ width: `${packageShare}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Orders Count */}
      <Card className="group relative overflow-hidden rounded-xl border border-border/70 bg-card p-5 shadow-xs transition-all duration-200 hover:border-chart-3/40 hover:shadow-md">
        <div className="absolute -top-4 -right-4 size-24 rounded-full bg-chart-3/5 transition-transform duration-300 group-hover:scale-125" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Đơn hàng thành công
            </span>
            <div className="flex size-10 items-center justify-center rounded-xl bg-chart-3/10 text-chart-3 shadow-2xs">
              <ShoppingBagIcon className="size-5" />
            </div>
          </div>

          <div className="text-2.5xl mt-3 font-heading font-bold tracking-tight text-foreground">
            {formatNumber(orders)}{' '}
            <span className="text-sm font-normal text-muted-foreground">đơn</span>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Giá trị TB:</span>
            <span className="inline-flex items-center rounded-full bg-chart-3/10 px-2.5 py-0.5 text-xs font-bold text-foreground">
              {formatCurrency(avgOrderValue)}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
