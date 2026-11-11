import { useMemo } from 'react';
import { Cell, Pie, PieChart } from 'recharts';
import { PieChartIcon } from 'lucide-react';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatting/formatters';
import { formatSharePercent } from '../../formatters';

export interface RevenueDistributionDonutChartProps {
  readonly serviceRevenue?: number;
  readonly packageRevenue?: number;
  readonly totalRevenue?: number;
  readonly isLoading?: boolean;
}

const donutConfig = {
  service: {
    label: 'Dịch vụ lẻ',
    color: 'var(--chart-1)',
  },
  package: {
    label: 'Gói dịch vụ',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

export function RevenueDistributionDonutChart({
  serviceRevenue = 0,
  packageRevenue = 0,
  totalRevenue = 0,
  isLoading,
}: RevenueDistributionDonutChartProps) {
  const chartData = useMemo(() => {
    return [
      {
        type: 'service',
        name: 'Dịch vụ lẻ',
        revenue: serviceRevenue,
        share: totalRevenue > 0 ? (serviceRevenue / totalRevenue) * 100 : 0,
        fill: 'var(--chart-1)',
      },
      {
        type: 'package',
        name: 'Gói dịch vụ',
        revenue: packageRevenue,
        share: totalRevenue > 0 ? (packageRevenue / totalRevenue) * 100 : 0,
        fill: 'var(--chart-2)',
      },
    ];
  }, [serviceRevenue, packageRevenue, totalRevenue]);

  const serviceShare = totalRevenue > 0 ? (serviceRevenue / totalRevenue) * 100 : 0;
  const packageShare = totalRevenue > 0 ? (packageRevenue / totalRevenue) * 100 : 0;

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
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-6">
          <Skeleton className="size-48 rounded-full" />
          <div className="mt-4 grid w-full grid-cols-2 gap-2">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col justify-between overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs p-0">
      <CardHeader className="border-b border-border/40 bg-muted/15 px-5 py-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-2xs">
            <PieChartIcon className="size-5" />
          </div>
          <div>
            <CardTitle className="font-heading text-base font-semibold tracking-tight text-foreground">
              Cơ cấu tỷ trọng doanh thu
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Phân bổ giữa Dịch vụ đơn lẻ và Gói liệu trình
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-between p-5">
        {totalRevenue === 0 ? (
          <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
            Chưa có doanh thu trong khoảng thời gian này
          </div>
        ) : (
          <div className="space-y-4">
            {/* Donut Chart with Center Text */}
            <div className="relative mx-auto flex items-center justify-center">
              <ChartContainer config={donutConfig} className="size-52">
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0]?.payload as (typeof chartData)[0] | undefined;
                      if (!item) return null;
                      return (
                        <div className="rounded-lg border border-border/80 bg-card/95 p-2.5 text-xs shadow-md">
                          <div className="flex items-center gap-1.5 font-medium text-foreground">
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: item.fill }}
                            />
                            <span>{item.name}</span>
                          </div>
                          <div className="mt-1 font-heading font-bold text-foreground">
                            {formatCurrency(item.revenue)} ({formatSharePercent(item.share)})
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Pie
                    data={chartData}
                    dataKey="revenue"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={4}
                    cornerRadius={4}
                    stroke="var(--card)"
                    strokeWidth={2}
                  >
                    <Cell fill="var(--chart-1)" />
                    <Cell fill="var(--chart-2)" />
                  </Pie>
                </PieChart>
              </ChartContainer>

              {/* Center Metrics */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                  Tổng thu
                </span>
                <span className="font-heading text-lg font-bold text-foreground">
                  {formatShortCurrency(totalRevenue)}
                </span>
              </div>
            </div>

            {/* Bottom Breakdown Pills */}
            <div className="grid grid-cols-2 gap-2 border-t border-border/40 pt-2">
              <div className="rounded-lg border border-border/60 bg-muted/15 p-2.5 transition-colors">
                <div className="text-2xs flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-chart-1" />
                    <span>Dịch vụ lẻ</span>
                  </span>
                  <span className="font-semibold text-chart-1">
                    {formatSharePercent(serviceShare)}
                  </span>
                </div>
                <div className="mt-1 font-heading text-sm font-bold text-foreground">
                  {formatCurrency(serviceRevenue)}
                </div>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/15 p-2.5 transition-colors">
                <div className="text-2xs flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-chart-2" />
                    <span>Gói dịch vụ</span>
                  </span>
                  <span className="font-semibold text-chart-2">
                    {formatSharePercent(packageShare)}
                  </span>
                </div>
                <div className="mt-1 font-heading text-sm font-bold text-foreground">
                  {formatCurrency(packageRevenue)}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
