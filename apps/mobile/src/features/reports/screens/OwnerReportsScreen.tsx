import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart3 } from 'lucide-react-native';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { ErrorState } from '@components/common/ErrorState';
import { colors, radius, spacing } from '@theme/index';
import { RevenueBarChart } from '../components/RevenueBarChart';
import { RevenueFilterBar } from '../components/RevenueFilterBar';
import { RevenueKpiCards } from '../components/RevenueKpiCards';
import { ReportSkeleton } from '../components/ReportSkeleton';
import { TopProductsCard } from '../components/TopProductsCard';
import { UnrecognizedPaymentsAlert } from '../components/UnrecognizedPaymentsAlert';
import { useRevenueByProduct } from '../hooks/useRevenueByProduct';
import { useRevenueReport } from '../hooks/useRevenueReport';
import { getVietnamToday, getVietnamYearStart } from '../utils/reportHelpers';
import type { ReportProductType, RevenueGroupBy } from '@spa/shared-types';

export function OwnerReportsScreen({
  title = 'Tổng quan kinh doanh',
  subtitle = 'Theo dõi doanh thu, số đơn và cơ cấu sản phẩm',
}: {
  title?: string;
  subtitle?: string;
} = {}) {
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
            paddingTop: insets.top + spacing.md,
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
        {/* 1. Header màn hình */}
        <View style={styles.header}>
          <View style={styles.headerIconCircle}>
            <BarChart3 size={24} color={colors.primary} />
          </View>
          <View style={styles.headerTextWrap}>
            <AppText accessibilityRole="header" style={styles.screenTitle}>
              {title}
            </AppText>
            {subtitle ? <AppText style={styles.screenSubtitle}>{subtitle}</AppText> : null}
          </View>
        </View>

        {/* 2. Bộ lọc thời gian & tiêu chí */}
        <RevenueFilterBar
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
            {/* Cảnh báo tiền chưa ghi nhận (nếu có) */}
            {revenueQuery.data?.unrecognizedPayments && (
              <UnrecognizedPaymentsAlert
                count={revenueQuery.data.unrecognizedPayments.count}
                amount={revenueQuery.data.unrecognizedPayments.amount}
              />
            )}

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  headerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontSize: 13,
    color: colors.muted,
  },
  dataContainer: {
    gap: spacing.lg,
  },
});
