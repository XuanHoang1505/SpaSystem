import { StyleSheet, View } from 'react-native';
import { AppText } from '@components/common/AppText';
import { formatCurrency } from '@/lib/formatting/formatters';
import { colors, radius, spacing } from '@theme/index';

interface OrderTotalsCardProps {
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  promotionCode?: string | null;
}

export function OrderTotalsCard({
  subtotal,
  discountTotal,
  grandTotal,
  promotionCode,
}: OrderTotalsCardProps) {
  return (
    <View style={styles.card}>
      <AppText style={styles.title}>Chi tiết thanh toán</AppText>

      <View style={styles.row}>
        <AppText style={styles.label}>Tạm tính</AppText>
        <AppText style={styles.value}>{formatCurrency(subtotal)}</AppText>
      </View>

      {discountTotal > 0 && (
        <View style={styles.row}>
          <AppText style={styles.label}>
            Giảm giá {promotionCode ? `(${promotionCode})` : ''}
          </AppText>
          <AppText style={styles.discountValue}>
            -{formatCurrency(discountTotal)}
          </AppText>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.row}>
        <AppText style={styles.totalLabel}>Tổng thanh toán</AppText>
        <AppText style={styles.totalValue}>{formatCurrency(grandTotal)}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  label: {
    fontSize: 14,
    color: colors.muted,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  discountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#15803d',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
});
