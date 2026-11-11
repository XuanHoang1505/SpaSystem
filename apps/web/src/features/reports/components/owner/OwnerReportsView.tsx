import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileSpreadsheetIcon, Loader2Icon } from 'lucide-react';
import type { ReportProductType, RevenueGroupBy } from '@spa/shared-types';
import { ErrorState } from '@/components/shared/ErrorState/ErrorState';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatLocalDate } from '@/lib/formatting/formatters';
import {
  getVietnamToday,
  getVietnamYearStart,
  groupByLabels,
  productTypeLabels,
} from '../../formatters';
import { useExportRevenueReport } from '../../hooks/useExportRevenueReport';
import { useRevenueByProduct } from '../../hooks/useRevenueByProduct';
import { useRevenueReport } from '../../hooks/useRevenueReport';
import { RevenueByProductTable } from './RevenueByProductTable';
import { RevenueDistributionDonutChart } from './RevenueDistributionDonutChart';
import { RevenueFilterToolbar } from './RevenueFilterToolbar';
import { RevenuePeriodChart } from './RevenuePeriodChart';
import { RevenuePeriodTable } from './RevenuePeriodTable';
import { RevenueSummaryCards } from './RevenueSummaryCards';
import { TopCustomersAndStaffCard } from './TopCustomersAndStaffCard';
import { TopProductsBarChart } from './TopProductsBarChart';
import { UnrecognizedPaymentsAlert } from './UnrecognizedPaymentsAlert';

export function OwnerReportsView() {
  const [searchParams, setSearchParams] = useSearchParams();

  const today = useMemo(() => getVietnamToday(), []);
  const yearStart = useMemo(() => getVietnamYearStart(today), [today]);

  const fromDate = searchParams.get('fromDate') || yearStart;
  const toDate = searchParams.get('toDate') || today;
  const groupBy = (searchParams.get('groupBy') as RevenueGroupBy) || 'month';
  const productType = (searchParams.get('productType') as ReportProductType) || 'all';
  const top = Number(searchParams.get('top')) || 10;

  const revenueQuery = useRevenueReport({
    fromDate,
    toDate,
    groupBy,
    productType,
  });

  const byProductQuery = useRevenueByProduct({
    fromDate,
    toDate,
    productType,
    top,
  });

  const { exportReport, isExporting } = useExportRevenueReport();

  const handleFiltersChange = useCallback(
    (next: {
      fromDate?: string;
      toDate?: string;
      groupBy?: RevenueGroupBy;
      productType?: ReportProductType;
      top?: number;
    }) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next.fromDate !== undefined) params.set('fromDate', next.fromDate);
          if (next.toDate !== undefined) params.set('toDate', next.toDate);
          if (next.groupBy !== undefined) params.set('groupBy', next.groupBy);
          if (next.productType !== undefined) params.set('productType', next.productType);
          if (next.top !== undefined) params.set('top', String(next.top));
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleResetFilters = useCallback(() => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.set('fromDate', yearStart);
        params.set('toDate', today);
        params.set('groupBy', 'month');
        params.set('productType', 'all');
        params.set('top', '10');
        return params;
      },
      { replace: true },
    );
  }, [setSearchParams, yearStart, today]);

  const handleExport = useCallback(() => {
    void exportReport({
      fromDate,
      toDate,
      groupBy,
      productType,
    });
  }, [exportReport, fromDate, toDate, groupBy, productType]);

  const handleRetry = useCallback(() => {
    void revenueQuery.refetch();
    void byProductQuery.refetch();
  }, [revenueQuery, byProductQuery]);

  const isError = revenueQuery.isError || byProductQuery.isError;
  const isLoading = revenueQuery.isLoading || byProductQuery.isLoading;

  return (
    <section className="space-y-6 rounded-2xl border bg-card p-5 shadow-xs sm:p-6 lg:p-8">
      {/* Header */}
      <PageHeader
        title="Báo cáo doanh thu"
        description={
          <span>
            Thống kê doanh thu từ ngày{' '}
            <strong className="font-semibold text-foreground">{formatLocalDate(fromDate)}</strong>{' '}
            đến <strong className="font-semibold text-foreground">{formatLocalDate(toDate)}</strong>{' '}
            ({groupByLabels[groupBy].toLowerCase()}, {productTypeLabels[productType].toLowerCase()})
          </span>
        }
        className="border-b pb-4"
        actions={
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleExport}
            disabled={isExporting || isLoading}
            className="gap-2 rounded-lg font-medium shadow-xs"
          >
            {isExporting ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <FileSpreadsheetIcon className="size-4" />
            )}
            <span>{isExporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
          </Button>
        }
      />

      {/* Filter Toolbar */}
      <RevenueFilterToolbar
        fromDate={fromDate}
        toDate={toDate}
        groupBy={groupBy}
        productType={productType}
        top={top}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetFilters}
        isFetching={revenueQuery.isFetching || byProductQuery.isFetching}
      />

      {/* Uncounted Payments Alert */}
      <UnrecognizedPaymentsAlert unrecognizedPayments={revenueQuery.data?.unrecognizedPayments} />

      {/* Error State */}
      {isError && (
        <ErrorState
          title="Không thể tải báo cáo doanh thu"
          message="Đã xảy ra lỗi khi kết nối máy chủ hoặc lấy số liệu thống kê. Vui lòng thử lại."
          onRetry={handleRetry}
        />
      )}

      {/* Summary KPI Cards */}
      {!isError && <RevenueSummaryCards report={revenueQuery.data} isLoading={isLoading} />}

      {/* Main Charts Row: Period Trend (8 cols) + Donut Breakdown (4 cols) */}
      {!isError && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <RevenuePeriodChart periods={revenueQuery.data?.periods} isLoading={isLoading} />
          </div>
          <div className="lg:col-span-4">
            <RevenueDistributionDonutChart
              serviceRevenue={revenueQuery.data?.serviceRevenue}
              packageRevenue={revenueQuery.data?.packageRevenue}
              totalRevenue={revenueQuery.data?.totalRevenue}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}

      {/* Secondary Insights Row: Top 5 Products Bar (6 cols) + Top Customers & Staff (6 cols) */}
      {!isError && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TopProductsBarChart items={byProductQuery.data?.items} isLoading={isLoading} />
          <TopCustomersAndStaffCard fromDate={fromDate} toDate={toDate} />
        </div>
      )}

      {/* Tables Breakdown Tabs */}
      {!isError && (
        <Tabs defaultValue="products" className="space-y-4">
          <TabsList className="bg-muted/70 p-1">
            <TabsTrigger value="products" className="text-xs font-medium sm:text-sm">
              Top {top} sản phẩm bán chạy (chi tiết)
            </TabsTrigger>
            <TabsTrigger value="periods" className="text-xs font-medium sm:text-sm">
              Bảng chi tiết số liệu theo kỳ ({groupByLabels[groupBy]})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="pt-1">
            <RevenueByProductTable
              items={byProductQuery.data?.items}
              isLoading={isLoading}
              top={top}
            />
          </TabsContent>

          <TabsContent value="periods" className="pt-1">
            <RevenuePeriodTable periods={revenueQuery.data?.periods} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      )}
    </section>
  );
}
