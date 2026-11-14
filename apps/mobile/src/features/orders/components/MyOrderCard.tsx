import { Pressable, StyleSheet, View } from 'react-native';
import type { MyOrderListItem } from '@spa/shared-types';
import { ChevronRight, Clock, ShoppingBag } from 'lucide-react-native';
import { AppButton } from '@components/common/AppButton';
import { AppText } from '@components/common/AppText';
import { formatCurrency } from '@/lib/formatting/formatters';
import { colors, radius, shadows, spacing } from '@theme/index';
import { formatUtcDateTimeVn } from '../utils/orderHelpers';
import { OrderStatusBadge } from './OrderStatusBadge';

export interface MyOrderCardProps {
  order: MyOrderListItem;
  onPressDetail: (order: MyOrderListItem) => void;
  onPressCancel?: (order: MyOrderListItem) => void;
  onPressPay?: (order: MyOrderListItem) => void;
  isPaying?: boolean;
}

export function MyOrderCard({
  order,
  onPressDetail,
  onPressCancel,
  onPressPay,
  isPaying = false,
}: MyOrderCardProps) {
  const isPendingPayable = order.status === 'pending_payment' && order.isPayable;
  const productsSummary =
    order.productNames && order.productNames.length > 0
      ? order.productNames.join(' · ')
      : 'Dịch vụ / Gói chăm sóc';

  return (
    <Pressable
      onPress={() => onPressDetail(order)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Đơn hàng ${order.code}, tổng thanh toán ${formatCurrency(order.grandTotal)}`}
    >
      {/* Top Header: Code & Status */}
      <View style={styles.headerRow}>
        <AppText style={styles.orderCode}>{order.code}</AppText>
        <OrderStatusBadge status={order.status} size="sm" />
      </View>

      {/* Created Date */}
      <AppText style={styles.dateText}>
        Ngày đặt: {formatUtcDateTimeVn(order.createdAtUtc)}
      </AppText>

      {/* Products Summary Box */}
      <View style={styles.summaryBox}>
        <View style={styles.summaryTopLine}>
          <ShoppingBag size={14} color={colors.primary} />
          <AppText style={styles.itemCountText}>{order.itemCount} sản phẩm</AppText>
        </View>
        <AppText style={styles.productNamesText} numberOfLines={2}>
          {productsSummary}
        </AppText>
      </View>

      {/* Due Date Warning if Pending */}
      {isPendingPayable && (
        <View style={styles.dueBox}>
          <Clock size={13} color={colors.warning} />
          <AppText style={styles.dueText} numberOfLines={1}>
            Hạn thanh toán: {formatUtcDateTimeVn(order.paymentDueAtUtc)}
          </AppText>
        </View>
      )}

      {/* Grand Total & Action Footer */}
      <View style={styles.totalRow}>
        <AppText style={styles.totalLabel}>Tổng thanh toán:</AppText>
        <AppText style={styles.totalValue}>{formatCurrency(order.grandTotal)}</AppText>
      </View>

      {/* Action Buttons for Pending Payable Orders */}
      {isPendingPayable && (onPressCancel || onPressPay) ? (
        <View style={styles.actionsRow}>
          {onPressCancel && order.canCancel && (
            <View style={styles.actionBtnHalf}>
              <AppButton
                title="Hủy đơn"
                variant="outline"
                onPress={() => onPressCancel(order)}
              />
            </View>
          )}
          {onPressPay && (
            <View style={styles.actionBtnHalf}>
              <AppButton
                title="Thanh toán lại"
                variant="primary"
                onPress={() => onPressPay(order)}
                loading={isPaying}
              />
            </View>
          )}
        </View>
      ) : (
        <View style={styles.detailLinkRow}>
          <AppText style={styles.detailLinkText}>Xem chi tiết đơn hàng</AppText>
          <ChevronRight size={15} color={colors.primary} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  cardPressed: {
    opacity: 0.95,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderCode: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 12,
    color: colors.muted,
  },
  summaryBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 4,
  },
  summaryTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  productNamesText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  dueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  dueText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.warning,
    lineHeight: 16,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  totalLabel: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  actionBtnHalf: {
    flex: 1,
  },
  detailLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    paddingTop: 2,
  },
  detailLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});
