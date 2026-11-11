import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { BarChart3Icon, LayersIcon, TrophyIcon } from 'lucide-react';
import type { RevenuePeriodDto } from '@spa/shared-types';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatLocalDate, formatNumber } from '@/lib/formatting/formatters';
import { formatSharePercent } from '../../formatters';

export interface RevenuePeriodChartProps {
  readonly periods?: readonly RevenuePeriodDto[] | null;
  readonly isLoading?: boolean;
}

type ChartMode = 'stacked' | 'grouped' | 'area';

const chartConfig = {
  serviceRevenue: {
    label: 'Dịch vụ lẻ',
    color: 'var(--chart-1)',
  },
  packageRevenue: {
    label: 'Gói dịch vụ',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

interface TooltipPayloadProps {
  readonly active?: boolean;
  readonly payload?: readonly {
    readonly payload?: RevenuePeriodDto;
  }[];
}

function RevenueChartTooltip({ active, payload }: TooltipPayloadProps) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="rounded-xl border border-border/80 bg-card/95 p-3.5 text-xs text-card-foreground shadow-xl ring-1 ring-black/5 backdrop-blur-sm">
      <div className="mb-2 border-b border-border/50 pb-2">
        <span className="text-sm font-semibold text-foreground">Kỳ {data.label}</span>
        <div className="text-2xs mt-0.5 text-muted-foreground">
          {formatLocalDate(data.periodStart)} – {formatLocalDate(data.periodEnd)}
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-medium text-muted-foreground">Tổng doanh thu:</span>
          <span className="font-heading text-sm font-bold text-foreground">
            {formatCurrency(data.revenue)}
          </span>
        </div>
        <div className="text-2xs flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-chart-1" />
            <span className="text-muted-foreground">Dịch vụ lẻ:</span>
          </span>
          <span className="font-semibold text-foreground">
            {formatCurrency(data.serviceRevenue)}
          </span>
        </div>
        <div className="text-2xs flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-chart-2" />
            <span className="text-muted-foreground">Gói dịch vụ:</span>
          </span>
          <span className="font-semibold text-foreground">
            {formatCurrency(data.packageRevenue)}
          </span>
        </div>
        <div className="text-2xs flex items-center justify-between border-t border-border/50 pt-2">
          <span className="text-muted-foreground">Số đơn hoàn tất:</span>
          <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 font-semibold text-secondary-foreground">
            {formatNumber(data.orderCount)} đơn
          </span>
        </div>
      </div>
    </div>
  );
}

export function RevenuePeriodChart({ periods, isLoading }: RevenuePeriodChartProps) {
  const [chartMode, setChartMode] = useState<ChartMode>('stacked');

  const items = useMemo(() => periods ?? [], [periods]);

  // Transform data for recharts
  const chartData = useMemo(() => {
    return items.map((p) => ({
      ...p,
      serviceRevenue: p.serviceRevenue,
      packageRevenue: p.packageRevenue,
    }));
  }, [items]);

  // Compute stats
  const stats = useMemo(() => {
    if (items.length === 0) return null;
    let peakIndex = 0;
    let totalRev = 0;
    let totalService = 0;
    let totalPackage = 0;

    items.forEach((p, idx) => {
      totalRev += p.revenue;
      totalService += p.serviceRevenue;
      totalPackage += p.packageRevenue;
      const currentPeak = items[peakIndex];
      if (currentPeak && p.revenue > currentPeak.revenue) {
        peakIndex = idx;
      }
    });

    const avgRev = totalRev / items.length;
    const servicePercent = totalRev > 0 ? (totalService / totalRev) * 100 : 0;
    const packagePercent = totalRev > 0 ? (totalPackage / totalRev) * 100 : 0;
    const peak = items[peakIndex] ?? items[0];

    if (!peak) return null;

    return {
      peakPeriod: peak,
      avgRevenue: avgRev,
      servicePercent,
      packagePercent,
    };
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
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-60" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex h-72 items-end gap-3 pt-8">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex-1 space-y-2">
                <Skeleton
                  className="w-full rounded-t-md"
                  style={{ height: `${(index % 4) * 20 + 35}%` }}
                />
                <Skeleton className="mx-auto h-3 w-10" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 border-t border-border/40 pt-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs p-0">
      <CardHeader className="flex flex-col gap-3 border-b border-border/40 bg-muted/15 px-5 py-4 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-2xs">
            <BarChart3Icon className="size-5" />
          </div>
          <div>
            <CardTitle className="font-heading text-base font-semibold tracking-tight text-foreground">
              Biểu đồ diễn biến doanh thu theo kỳ
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Thống kê doanh thu thực tế theo mốc thời gian Việt Nam (UTC+7)
            </p>
          </div>
        </div>

        {/* Legend & Mode Switcher */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-chart-1 shadow-2xs" />
              <span className="font-medium text-foreground">Dịch vụ lẻ</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-chart-2 shadow-2xs" />
              <span className="font-medium text-foreground">Gói dịch vụ</span>
            </div>
          </div>

          <div className="flex items-center rounded-lg border border-border/70 bg-background/80 p-0.5 text-xs shadow-2xs backdrop-blur-xs">
            <button
              type="button"
              onClick={() => setChartMode('stacked')}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                chartMode === 'stacked'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Cột chồng
            </button>
            <button
              type="button"
              onClick={() => setChartMode('grouped')}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                chartMode === 'grouped'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Cột đôi
            </button>
            <button
              type="button"
              onClick={() => setChartMode('area')}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                chartMode === 'area'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Vùng xu hướng
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-6">
        {items.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Không có dữ liệu kỳ báo cáo trong khoảng thời gian này
          </div>
        ) : (
          <div>
            {/* shadcn ChartContainer with Recharts */}
            <ChartContainer config={chartConfig} className="h-72 w-full">
              {chartMode === 'area' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillService" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="fillPackage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    className="stroke-border/40"
                  />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-[11px] font-medium"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatShortCurrency}
                    width={55}
                    className="font-mono text-[11px] font-medium"
                  />
                  <ChartTooltip content={<RevenueChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="serviceRevenue"
                    stackId="revenue"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="url(#fillService)"
                  />
                  <Area
                    type="monotone"
                    dataKey="packageRevenue"
                    stackId="revenue"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    fill="url(#fillPackage)"
                  />
                </AreaChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    className="stroke-border/40"
                  />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-[11px] font-medium"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatShortCurrency}
                    width={55}
                    className="font-mono text-[11px] font-medium"
                  />
                  <ChartTooltip content={<RevenueChartTooltip />} />
                  {chartMode === 'stacked' ? (
                    <>
                      <Bar
                        dataKey="serviceRevenue"
                        stackId="revenue"
                        fill="var(--color-serviceRevenue)"
                        radius={[0, 0, 4, 4]}
                      />
                      <Bar
                        dataKey="packageRevenue"
                        stackId="revenue"
                        fill="var(--color-packageRevenue)"
                        radius={[4, 4, 0, 0]}
                      />
                    </>
                  ) : (
                    <>
                      <Bar
                        dataKey="serviceRevenue"
                        fill="var(--color-serviceRevenue)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="packageRevenue"
                        fill="var(--color-packageRevenue)"
                        radius={[4, 4, 0, 0]}
                      />
                    </>
                  )}
                </BarChart>
              )}
            </ChartContainer>

            {/* Bottom Executive Metrics Breakdown (DropX Tiles) */}
            {stats && (
              <div className="mt-6 grid grid-cols-1 gap-3 border-t border-border/50 pt-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 shadow-2xs transition-colors hover:border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <TrophyIcon className="size-3.5 text-amber-500" />
                    <span>Kỳ đạt doanh thu cao nhất</span>
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between">
                    <span className="font-heading text-sm font-semibold text-foreground">
                      Kỳ {stats.peakPeriod.label}
                    </span>
                    <span className="font-heading text-sm font-bold text-primary">
                      {formatCurrency(stats.peakPeriod.revenue)}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 shadow-2xs transition-colors hover:border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BarChart3Icon className="size-3.5 text-chart-4" />
                    <span>Doanh thu trung bình mỗi kỳ</span>
                  </div>
                  <div className="mt-1.5">
                    <span className="font-heading text-sm font-bold text-foreground">
                      {formatCurrency(stats.avgRevenue)}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 shadow-2xs transition-colors hover:border-border">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <LayersIcon className="size-3.5 text-chart-1" />
                      <span>Tỷ trọng DV / Gói</span>
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatSharePercent(stats.servicePercent)} /{' '}
                      {formatSharePercent(stats.packagePercent)}
                    </span>
                  </div>
                  <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-chart-1 transition-all duration-500"
                      style={{ width: `${stats.servicePercent}%` }}
                      title={`Dịch vụ: ${formatSharePercent(stats.servicePercent)}`}
                    />
                    <div
                      className="h-full bg-chart-2 transition-all duration-500"
                      style={{ width: `${stats.packagePercent}%` }}
                      title={`Gói: ${formatSharePercent(stats.packagePercent)}`}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
