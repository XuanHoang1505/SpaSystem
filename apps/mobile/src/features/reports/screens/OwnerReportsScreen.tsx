import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppScreen } from '@components/common/AppScreen';
import { ErrorState } from '@components/common/ErrorState';
import { colors, spacing } from '@theme/index';
import { RevenueBarChart } from '../components/RevenueBarChart';
import { RevenueFilterSheet } from '../components/RevenueFilterSheet';
import { RevenueKpiCards } from '../components/RevenueKpiCards';
import { ReportSkeleton } from '../components/ReportSkeleton';
import { TopProductsCard } from '../components/TopProductsCard';
import { useRevenueByProduct } from '../hooks/useRevenueByProduct';
import { useRevenueReport } from '../hooks/useRevenueReport';
import { getVietnamToday, getVietnamYearStart } from '../utils/reportHelpers';
import type { ReportProductType, RevenueGroupBy } from '@spa/shared-types';

/** Owner revenue overview: the navigation bar already names the screen, so it opens on the filter summary. */
export function OwnerReportsScreen() {
  const insets = useSafeAreaInsets();

  // State bộ lọc mặc định: từ đầu năm hiện tại đến hôm nay, nhóm tháng, tất cả sản phẩm
  const [fromDate, setFromDate] = useState(() => getVietnamYearStart());
  const [toDate, setToDate] = useState(() => getVietnamToday());
  const [groupBy, setGroupBy] = useState<RevenueGroupBy>('month');
  const [productType, setProductType] = useState<ReportProductType>('all');

  // React Query calls
  const revenueQuery = useRevenueReport({ fromDate, toDate, groupBy, productType });
  const productsQuery = useRevenueByProduct({ fromDate, toDate, productType, top: 10 });

  // Refresh control
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([revenueQuery.refetch(), productsQuery.refetch()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [revenueQuery, productsQuery]);

  const handleResetFilters = useCallback(() => {
    setFromDate(getVietnamYearStart());
    setToDate(getVietnamToday());
    setGroupBy('month');
    setProductType('all');
  }, []);

  const handleDateRangeChange = useCallback((from: string, to: string) => {
    setFromDate(from);
    setToDate(to);
  }, []);

  const hasError = revenueQuery.isError || productsQuery.isError;
  const isLoading = (revenueQuery.isLoading || productsQuery.isLoading) && !isRefreshing;

  return (
    <AppScreen scroll={false} style={styles.screen}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + spacing.xl * 2,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* 2. Bộ lọc thời gian & tiêu chí */}
        <RevenueFilterSheet
          fromDate={fromDate}
          toDate={toDate}
          groupBy={groupBy}
          productType={productType}
          onDateRangeChange={handleDateRangeChange}
          onGroupByChange={setGroupBy}
          onProductTypeChange={setProductType}
          onReset={handleResetFilters}
        />

        {/* 3. Nội dung báo cáo / Trạng thái */}
        {hasError ? (
          <ErrorState
            message="Không thể tải dữ liệu báo cáo. Vui lòng kiểm tra kết nối mạng và thử lại."
            onRetry={() => {
              revenueQuery.refetch();
              productsQuery.refetch();
            }}
          />
        ) : isLoading ? (
          <ReportSkeleton />
        ) : (
          <View style={styles.dataContainer}>
            {/* Các thẻ chỉ số KPI tổng quan */}
            <RevenueKpiCards
              totalRevenue={revenueQuery.data?.totalRevenue ?? 0}
              serviceRevenue={revenueQuery.data?.serviceRevenue ?? 0}
              packageRevenue={revenueQuery.data?.packageRevenue ?? 0}
              orderCount={revenueQuery.data?.orderCount ?? 0}
              productType={productType}
            />

            {/* Biểu đồ cột xu hướng theo kỳ */}
            <RevenueBarChart periods={revenueQuery.data?.periods} />

            {/* Danh sách Top sản phẩm đóng góp doanh thu */}
            <TopProductsCard items={productsQuery.data?.items} />
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  dataContainer: {
    gap: spacing.lg,
  },
});
