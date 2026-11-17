import { StyleSheet, View } from 'react-native';
import { Package, ShoppingBag, Sparkles, TrendingUp } from 'lucide-react-native';
import { AppText } from '@components/common/AppText';
import { formatCurrency, formatNumber } from '@/lib/formatting/formatters';
import { colors, radius, shadows, spacing } from '@theme/index';
import { formatSharePercent } from '../utils/reportHelpers';
import type { ReportProductType } from '@spa/shared-types';

export function RevenueKpiCards({
  totalRevenue,
  serviceRevenue,
  packageRevenue,
  orderCount,
  productType = 'all',
}: {
  totalRevenue: number;
  serviceRevenue: number;
  packageRevenue: number;
  orderCount: number;
  productType?: ReportProductType;
}) {
  const servicePercent = totalRevenue > 0 ? (serviceRevenue / totalRevenue) * 100 : 0;
  const packagePercent = totalRevenue > 0 ? (packageRevenue / totalRevenue) * 100 : 0;

  const totalSubtitle =
    productType === 'service'
      ? 'Chỉ tính dịch vụ lẻ'
      : productType === 'package'
        ? 'Chỉ tính gói liệu trình'
        : 'Doanh thu dịch vụ & gói';

  return (
    <View style={styles.grid}>
      {/* 1. Tổng doanh thu - Thẻ rộng nổi bật */}
      <View style={[styles.card, styles.highlightCard]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
            <TrendingUp size={20} color={colors.primary} />
          </View>
          <View style={styles.badge}>
            <AppText style={styles.badgeText}>Thực thu</AppText>
          </View>
        </View>
        <View style={styles.valueWrap}>
          <AppText style={styles.label}>Tổng doanh thu</AppText>
          <AppText style={styles.highlightValue}>{formatCurrency(totalRevenue)}</AppText>
        </View>
        <AppText style={styles.subtext}>{totalSubtitle}</AppText>
      </View>

      {/* Lưới 2 cột cho các chỉ số thành phần */}
      <View style={styles.twoColumnRow}>
        {/* 2. Dịch vụ lẻ */}
        <View style={[styles.card, styles.halfCard]}>
          <View style={styles.headerRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#E2EBF3' }]}>
              <Sparkles size={18} color="#2F5677" />
            </View>
            <View style={[styles.miniPercentBadge, { backgroundColor: '#E2EBF3' }]}>
              <AppText style={[styles.miniPercentText, { color: '#2F5677' }]}>
                {formatSharePercent(servicePercent)}
              </AppText>
            </View>
          </View>
          <View style={styles.valueWrap}>
            <AppText style={styles.label}>Dịch vụ lẻ</AppText>
            <AppText style={styles.cardValue}>{formatCurrency(serviceRevenue)}</AppText>
          </View>
          <AppText style={styles.subtext}>Chiếm {formatSharePercent(servicePercent)}</AppText>
        </View>

        {/* 3. Gói liệu trình */}
        <View style={[styles.card, styles.halfCard]}>
          <View style={styles.headerRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#E3EFE5' }]}>
              <Package size={18} color="#386647" />
            </View>
            <View style={[styles.miniPercentBadge, { backgroundColor: '#E3EFE5' }]}>
              <AppText style={[styles.miniPercentText, { color: '#386647' }]}>
                {formatSharePercent(packagePercent)}
              </AppText>
            </View>
          </View>
          <View style={styles.valueWrap}>
            <AppText style={styles.label}>Gói liệu trình</AppText>
            <AppText style={styles.cardValue}>{formatCurrency(packageRevenue)}</AppText>
          </View>
          <AppText style={styles.subtext}>Chiếm {formatSharePercent(packagePercent)}</AppText>
        </View>
      </View>

      {/* 4. Tổng số đơn hàng */}
      <View style={styles.card}>
        <View style={styles.singleRowCard}>
          <View style={[styles.iconCircle, { backgroundColor: colors.neutralSoft }]}>
            <ShoppingBag size={18} color={colors.neutral} />
          </View>
          <View style={styles.singleRowText}>
            <AppText style={styles.label}>Số đơn hoàn tất thành công</AppText>
            <AppText style={styles.subtext}>Đơn có ít nhất một khoản thanh toán được ghi nhận</AppText>
          </View>
          <View style={styles.orderCountWrap}>
            <AppText style={styles.orderCountValue}>{formatNumber(orderCount)}</AppText>
            <AppText style={styles.orderCountUnit}>đơn</AppText>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.card,
  },
  highlightCard: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.border,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfCard: {
    flex: 1,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  miniPercentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  miniPercentText: {
    fontSize: 11,
    fontWeight: '700',
  },
  valueWrap: {
    marginTop: 4,
    gap: 2,
  },
  label: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '500',
  },
  highlightValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtext: {
    fontSize: 12,
    color: colors.muted,
  },
  singleRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  singleRowText: {
    flex: 1,
    gap: 2,
  },
  orderCountWrap: {
    alignItems: 'flex-end',
  },
  orderCountValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  orderCountUnit: {
    fontSize: 12,
    color: colors.muted,
  },
});
