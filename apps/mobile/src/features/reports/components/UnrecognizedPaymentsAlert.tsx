import { StyleSheet, View } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';
import { AppText } from '@components/common/AppText';
import { formatCurrency } from '@/lib/formatting/formatters';
import { colors, radius, spacing } from '@theme/index';

export function UnrecognizedPaymentsAlert({
  count,
  amount,
}: {
  count: number;
  amount: number;
}) {
  if (count <= 0) return null;

  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.iconCircle}>
        <TriangleAlert size={20} color={colors.warning} />
      </View>
      <View style={styles.textWrap}>
        <AppText style={styles.title}>Cảnh báo khoản thu chưa ghi nhận</AppText>
        <AppText style={styles.description}>
          Phát hiện{' '}
          <AppText style={styles.highlight}>{count} giao dịch thành công</AppText> với tổng số tiền{' '}
          <AppText style={styles.highlight}>{formatCurrency(amount)}</AppText> trên đơn hủy hoặc
          thanh toán thừa. Vui lòng rà soát trên trang quản lý để hoàn tiền thủ công cho khách hàng.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warningSoft,
    borderColor: colors.warningBorder,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  textWrap: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.warning,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6B4E1B',
  },
  highlight: {
    fontWeight: '700',
    color: colors.warning,
  },
});
