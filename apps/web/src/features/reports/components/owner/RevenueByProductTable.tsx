import { useMemo } from 'react';
import { PackageIcon, ShoppingBagIcon, SparklesIcon } from 'lucide-react';
import type { ProductRevenueDto } from '@spa/shared-types';
import {
  DataTable,
  type DataTableColumn,
} from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { ImageWithFallback } from '@/components/shared/ImageWithFallback/ImageWithFallback';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePackageSearch } from '@/features/service-packages';
import { useServiceSearch } from '@/features/services';
import { formatCurrency, formatNumber } from '@/lib/formatting/formatters';
import { formatSharePercent, productKindConfig } from '../../formatters';

export interface RevenueByProductTableProps {
  readonly items?: readonly ProductRevenueDto[] | null;
  readonly isLoading?: boolean;
  readonly top?: number;
}

export function RevenueByProductTable({
  items,
  isLoading,
  top = 10,
}: RevenueByProductTableProps) {
  const data = useMemo(() => items ?? [], [items]);

  // Load catalog images for services and packages
  const servicesQuery = useServiceSearch({ pageSize: 100 });
  const packagesQuery = usePackageSearch({ pageSize: 100 });

  const imageMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    servicesQuery.data?.items.forEach((s) => {
      if (s.imageUrl) map[s.id] = s.imageUrl;
    });
    packagesQuery.data?.items.forEach((p) => {
      if (p.imageUrl) map[p.id] = p.imageUrl;
    });
    return map;
  }, [servicesQuery.data, packagesQuery.data]);

  const columns = useMemo<readonly DataTableColumn<ProductRevenueDto>[]>(
    () => [
      {
        id: 'rank',
        header: '#',
        className: 'w-14 text-center',
        cell: (row) => {
          const index = data.indexOf(row);
          const rank = index >= 0 ? index + 1 : 1;

          if (rank === 1) {
            return (
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 font-heading font-bold text-xs ring-1 ring-amber-500/30 shadow-2xs">
                #1
              </span>
            );
          }
          if (rank === 2) {
            return (
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-slate-400/20 text-slate-800 dark:text-slate-200 font-heading font-bold text-xs ring-1 ring-slate-400/40 shadow-2xs">
                #2
              </span>
            );
          }
          if (rank === 3) {
            return (
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-amber-700/15 text-amber-900 dark:text-amber-400 font-heading font-bold text-xs ring-1 ring-amber-700/30 shadow-2xs">
                #3
              </span>
            );
          }

          return (
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground font-mono text-xs font-medium">
              {rank}
            </span>
          );
        },
      },
      {
        id: 'image',
        header: 'Ảnh',
        className: 'w-16',
        cell: (row) => {
          const imageUrl = imageMap[row.productId];
          const isService = row.productType === 'service';

          return (
            <ImageWithFallback
              src={imageUrl ?? null}
              alt={row.productName}
              fallbackIcon={isService ? SparklesIcon : PackageIcon}
              className="size-11 rounded-lg border border-border/70 object-cover shadow-2xs"
            />
          );
        },
      },
      {
        id: 'productName',
        header: 'Tên sản phẩm',
        cell: (row) => (
          <div className="flex flex-col">
            <span className="font-semibold text-foreground text-sm leading-snug">
              {row.productName}
            </span>
            <span className="text-2xs text-muted-foreground font-mono mt-0.5">
              Mã: {row.productId.slice(0, 8)}
            </span>
          </div>
        ),
      },
      {
        id: 'productType',
        header: 'Phân loại',
        className: 'w-32',
        cell: (row) => {
          const config = productKindConfig[row.productType];
          return <StatusBadge label={config.label} tone={config.tone} />;
        },
      },
      {
        id: 'quantity',
        header: 'Lượt mua',
        hideBelow: 'sm',
        className: 'w-28',
        cell: (row) => (
          <div className="text-sm font-medium text-foreground">
            {formatNumber(row.quantity)}{' '}
            <span className="text-xs font-normal text-muted-foreground">lượt</span>
          </div>
        ),
      },
      {
        id: 'revenue',
        header: 'Doanh thu',
        cell: (row) => {
          const avgPerSale = row.quantity > 0 ? row.revenue / row.quantity : 0;
          return (
            <div className="flex flex-col">
              <span className="font-heading font-bold text-foreground text-sm">
                {formatCurrency(row.revenue)}
              </span>
              <span className="text-2xs text-muted-foreground">
                TB: {formatCurrency(avgPerSale)}/lượt
              </span>
            </div>
          );
        },
      },
      {
        id: 'sharePercent',
        header: 'Tỷ trọng',
        cell: (row) => {
          const isService = row.productType === 'service';
          return (
            <div className="flex items-center gap-3 min-w-36">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/80">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isService ? 'bg-chart-1' : 'bg-chart-2'
                  }`}
                  style={{ width: `${Math.min(row.sharePercent, 100)}%` }}
                />
              </div>
              <span className="w-12 text-right text-xs font-semibold text-foreground font-mono">
                {formatSharePercent(row.sharePercent)}
              </span>
            </div>
          );
        },
      },
    ],
    [data, imageMap],
  );

  return (
    <Card className="rounded-xl border border-border/70 bg-card shadow-xs overflow-hidden p-0">
      <CardHeader className="border-b border-border/40 bg-muted/15 pt-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-2xs shrink-0">
              <ShoppingBagIcon className="size-5" />
            </div>
            <div>
              <CardTitle className="font-heading text-base font-semibold tracking-tight text-foreground">
                Top {top} sản phẩm doanh thu cao nhất
              </CardTitle>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <DataTable<ProductRevenueDto>
          columns={columns}
          data={data}
          getRowId={(row: ProductRevenueDto) => `${row.productType}-${row.productId}`}
          caption="Top sản phẩm có doanh thu cao nhất"
          isLoading={isLoading}
          empty={
            <EmptyState
              title="Chưa có dữ liệu sản phẩm"
              description="Không có sản phẩm nào phát sinh doanh thu trong khoảng thời gian này."
            />
          }
        />
      </CardContent>
    </Card>
  );
}
