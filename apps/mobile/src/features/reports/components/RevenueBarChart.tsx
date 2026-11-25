import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BarChart3, Calendar, Trophy } from 'lucide-react-native';
import { AppText } from '@components/common/AppText';
import { formatCurrency, formatLocalDate, formatNumber } from '@/lib/formatting/formatters';
import { colors, radius, shadows, spacing } from '@theme/index';
import type { RevenuePeriodDto } from '@spa/shared-types';

const CHART_HEIGHT = 150;
const BAR_WIDTH = 48;

function formatCompactRevenue(value: number): string {
  if (value <= 0) return '0đ';
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}tỷ`;
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${millions >= 10 ? Math.round(millions) : millions.toFixed(1)}tr`;
  }
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return `${value}đ`;
}

export function RevenueBarChart({ periods }: { periods?: readonly RevenuePeriodDto[] }) {
  const items = useMemo(() => periods ?? [], [periods]);

  // Tìm kỳ có doanh thu lớn nhất
  const { maxRevenue, peakPeriodIndex } = useMemo(() => {
    let max = 0;
    let peakIdx = -1;
    items.forEach((p, idx) => {
      if (p.revenue > max) {
        max = p.revenue;
        peakIdx = idx;
      }
    });
    return { maxRevenue: Math.max(max, 1), peakPeriodIndex: peakIdx };
  }, [items]);

  // Kỳ được chọn để hiển thị chi tiết (mặc định kỳ cuối hoặc đỉnh)
  const [selectedIndex, setSelectedIndex] = useState<number>(() => {
    if (peakPeriodIndex >= 0) return peakPeriodIndex;
    return items.length > 0 ? items.length - 1 : 0;
  });

  const selectedPeriod = items[selectedIndex] ?? items[items.length - 1] ?? null;

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <AppText style={styles.emptyText}>Chưa có dữ liệu kỳ báo cáo</AppText>
      </View>
    );
  }

  const renderBars = () => (
    <View style={styles.barsContainer}>
      {items.map((period, index) => {
        const isSelected = index === selectedIndex;
        const isPeak = index === peakPeriodIndex && maxRevenue > 1;

        // Tính chiều cao tổng của cột
        const totalHeight =
          period.revenue > 0 ? Math.max(8, (period.revenue / maxRevenue) * CHART_HEIGHT) : 4;

        // Tách chiều cao của 2 phân hệ: dịch vụ lẻ & gói liệu trình
        const serviceHeight =
          period.revenue > 0 ? (period.serviceRevenue / period.revenue) * totalHeight : 0;
        const packageHeight =
          period.revenue > 0 ? (period.packageRevenue / period.revenue) * totalHeight : 0;

        return (
          <Pressable
            key={`${period.label}-${period.periodStart}`}
            style={[styles.barColumn, isSelected && styles.selectedBarColumn]}
            onPress={() => setSelectedIndex(index)}
            accessibilityRole="button"
            accessibilityLabel={`Kỳ ${period.label}, doanh thu ${formatCurrency(period.revenue)}`}
          >
            {/* Huy hiệu đỉnh doanh thu */}
            <View style={styles.peakBadgeWrap}>
              {isPeak ? (
                <View style={styles.peakBadge}>
                  <Trophy size={10} color="#8A6116" />
                </View>
              ) : null}
            </View>

            {/* Vùng vẽ cột */}
            <View style={styles.track}>
              <View
                style={[
                  styles.barFill,
                  { height: totalHeight },
                  period.revenue === 0 && styles.zeroBar,
                  isSelected && styles.barFillSelected,
                ]}
              >
                {/* Phân đoạn Gói liệu trình (ở trên) */}
                {packageHeight > 0 ? (
                  <View
                    style={[
                      styles.packageSegment,
                      { height: packageHeight },
                      serviceHeight === 0 && styles.singleSegmentRounded,
                    ]}
                  />
                ) : null}

                {/* Phân đoạn Dịch vụ lẻ (ở dưới) */}
                {serviceHeight > 0 ? (
                  <View
                    style={[
                      styles.serviceSegment,
                      { height: serviceHeight },
                      packageHeight === 0 && styles.singleSegmentRounded,
                    ]}
                  />
                ) : null}
              </View>
            </View>

            {/* Nhãn kỳ */}
            <View style={[styles.labelPill, isSelected && styles.selectedLabelPill]}>
              <AppText
                style={[styles.periodLabel, isSelected && styles.selectedPeriodLabel]}
                numberOfLines={1}
              >
                {period.label}
              </AppText>
            </View>

            {/* Doanh thu rút gọn */}
            <AppText style={[styles.revenueText, isSelected && styles.selectedRevenueText]}>
              {formatCompactRevenue(period.revenue)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 1. Tiêu đề và chú giải màu sắc */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <BarChart3 size={18} color={colors.primary} />
          <AppText style={styles.chartTitle}>Xu hướng theo kỳ</AppText>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <AppText style={styles.legendText}>Gói</AppText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2F5677' }]} />
            <AppText style={styles.legendText}>Dịch vụ</AppText>
          </View>
        </View>
      </View>

      {/* 2. Khu vực biểu đồ (Hỗ trợ cuộn ngang nếu nhiều hơn 4 kỳ) */}
      <View style={styles.chartArea}>
        {items.length > 4 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {renderBars()}
          </ScrollView>
        ) : (
          renderBars()
        )}
      </View>

      {/* 3. Chi tiết kỳ đang chọn */}
      {selectedPeriod ? (
        <View style={styles.selectedDetailCard}>
          <View style={styles.selectedHeader}>
            <View style={styles.selectedTitleRow}>
              <Calendar size={14} color={colors.primary} />
              <AppText style={styles.selectedTitle}>Kỳ {selectedPeriod.label}</AppText>
            </View>
            <AppText style={styles.selectedRange}>
              {formatLocalDate(selectedPeriod.periodStart)} –{' '}
              {formatLocalDate(selectedPeriod.periodEnd)}
            </AppText>
          </View>

          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <AppText style={styles.detailLabel}>Tổng thu kỳ này</AppText>
              <AppText style={styles.detailPrimaryValue}>
                {formatCurrency(selectedPeriod.revenue)}
              </AppText>
            </View>
            <View style={styles.detailItem}>
              <AppText style={styles.detailLabel}>Số đơn hoàn tất</AppText>
              <AppText style={styles.detailValue}>
                {formatNumber(selectedPeriod.orderCount)} đơn
              </AppText>
            </View>
          </View>

          <View style={styles.splitRow}>
            <View style={styles.splitItem}>
              <View style={[styles.splitIndicator, { backgroundColor: '#2F5677' }]} />
              <View>
                <AppText style={styles.splitLabel}>Dịch vụ lẻ</AppText>
                <AppText style={styles.splitValue}>
                  {formatCurrency(selectedPeriod.serviceRevenue)}
                </AppText>
              </View>
            </View>
            <View style={styles.splitDivider} />
            <View style={styles.splitItem}>
              <View style={[styles.splitIndicator, { backgroundColor: colors.primary }]} />
              <View>
                <AppText style={styles.splitLabel}>Gói liệu trình</AppText>
                <AppText style={styles.splitValue}>
                  {formatCurrency(selectedPeriod.packageRevenue)}
                </AppText>
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 14,
    paddingVertical: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
  },
  chartArea: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.xs,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: CHART_HEIGHT + 50,
    gap: spacing.sm,
  },
  barColumn: {
    width: BAR_WIDTH,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radius.small,
  },
  selectedBarColumn: {
    backgroundColor: 'rgba(47, 107, 69, 0.06)',
  },
  peakBadgeWrap: {
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  peakBadge: {
    backgroundColor: '#F7ECD9',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#EAD3A8',
  },
  track: {
    height: CHART_HEIGHT,
    width: 24,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barFill: {
    width: 20,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  barFillSelected: {
    width: 24,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  zeroBar: {
    backgroundColor: colors.border,
    height: 4,
  },
  packageSegment: {
    backgroundColor: colors.primary,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  serviceSegment: {
    backgroundColor: '#2F5677',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  singleSegmentRounded: {
    borderRadius: 6,
  },
  labelPill: {
    marginTop: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectedLabelPill: {
    backgroundColor: colors.primarySoft,
  },
  periodLabel: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedPeriodLabel: {
    color: colors.primary,
    fontWeight: '700',
  },
  revenueText: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 2,
    fontWeight: '500',
  },
  selectedRevenueText: {
    color: colors.primary,
    fontWeight: '700',
  },
  selectedDetailCard: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.small,
    padding: spacing.md,
    gap: spacing.sm,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
  },
  selectedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  selectedRange: {
    fontSize: 11,
    color: colors.muted,
  },
  detailGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    gap: 2,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.muted,
  },
  detailPrimaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.small,
    marginTop: 2,
  },
  splitItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  splitIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  splitDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  splitLabel: {
    fontSize: 10,
    color: colors.muted,
  },
  splitValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
});
