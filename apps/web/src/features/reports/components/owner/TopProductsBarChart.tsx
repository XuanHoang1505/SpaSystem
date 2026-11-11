import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { AwardIcon } from 'lucide-react';
import type { ProductRevenueDto } from '@spa/shared-types';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatting/formatters';
import { formatSharePercent } from '../../formatters';

export interface TopProductsBarChartProps {
  readonly items?: readonly ProductRevenueDto[] | null;
  readonly isLoading?: boolean;
}

const topProductsConfig = {
  revenue: {
    label: 'Doanh thu',
    color: 'var(--primary)',
  },
} satisfies ChartConfig;

export function TopProductsBarChart({ items, isLoading }: TopProductsBarChartProps) {
  const top5 = useMemo(() => {
    return (items ?? []).slice(0, 5).map((p) => ({
      name: p.productName.length > 20 ? `${p.productName.slice(0, 20)}…` : p.productName,
      fullName: p.productName,
      revenue: p.revenue,
      quantity: p.quantity,
      sharePercent: p.sharePercent,
      productType: p.productType,
      fill: p.productType === 'service' ? 'var(--chart-1)' : 'var(--chart-2)',
    }));
  }, [items]);

  const formatShortCurrency = (val: number) => {
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)} tỷ`;
    if (val >= 1_000_000) return `${Math.round(val / 1_000_000)} tr`;
    if (val >= 1_000) return `${Math.round(val / 1_000)} k`;
    return '0 đ';
  };

  if (isLoading) {
    return (
      <Card className="rounded-xl border border-border/70 shadow-xs">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-full rounded-md" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs p-0">
      <CardHeader className="border-b border-border/40 bg-muted/15 px-5 py-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-2xs">
              <AwardIcon className="size-5" />
            </div>
            <div>
              <CardTitle className="font-heading text-base font-semibold tracking-tight text-foreground">
                Top 5 sản phẩm sinh lời nhất
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Các dịch vụ và gói liệu trình đóng góp doanh số cao nhất
              </p>
            </div>
          </div>

          <div className="text-2xs flex items-center gap-2.5">
            <span className="flex items-center gap-1 text-muted-foreground">
              <span className="size-2 rounded-full bg-chart-1" />
              <span>Dịch vụ</span>
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <span className="size-2 rounded-full bg-chart-2" />
              <span>Gói</span>
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {top5.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            Chưa có số liệu sản phẩm trong khoảng thời gian này
          </div>
        ) : (
          <ChartContainer config={topProductsConfig} className="h-64 w-full">
            <BarChart
              data={top5}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid
                horizontal={false}
                strokeDasharray="3 3"
                className="stroke-border/40"
              />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickFormatter={formatShortCurrency}
                className="font-mono text-[11px] font-medium"
              />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                width={120}
                className="text-[11px] font-medium"
              />
              <ChartTooltip
                cursor={{ fill: 'var(--primary)', opacity: 0.05 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0]?.payload as (typeof top5)[0] | undefined;
                  if (!item) return null;
                  return (
                    <div className="rounded-lg border border-border/80 bg-card/95 p-3 text-xs shadow-md">
                      <div className="font-semibold text-foreground">{item.fullName}</div>
                      <div className="text-2xs mt-0.5 text-muted-foreground">
                        {item.productType === 'service' ? 'Dịch vụ đơn lẻ' : 'Gói liệu trình'} •{' '}
                        {item.quantity} lượt mua
                      </div>
                      <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-border/50 pt-1.5">
                        <span className="text-muted-foreground">Doanh thu:</span>
                        <span className="font-heading font-bold text-foreground">
                          {formatCurrency(item.revenue)} ({formatSharePercent(item.sharePercent)})
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
