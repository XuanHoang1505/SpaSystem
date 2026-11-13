import { StyleSheet, View } from 'react-native';
import { CheckCircle2, Circle, CreditCard, ShieldCheck } from 'lucide-react-native';
import { AppText } from '@components/common/AppText';
import { colors, radius, spacing } from '@theme/index';

export function PaymentMethodSelector() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <CreditCard size={18} color={colors.primary} />
        <AppText style={styles.title}>Phương thức thanh toán</AppText>
      </View>

      {/* VNPay Option (Active) */}
      <View style={[styles.methodItem, styles.methodItemActive]}>
        <View style={styles.radioCol}>
          <CheckCircle2 size={20} color={colors.primary} />
        </View>
        <View style={styles.infoCol}>
          <View style={styles.labelRow}>
            <AppText style={styles.methodName}>Cổng thanh toán VNPay</AppText>
            <View style={styles.recommendedBadge}>
              <AppText style={styles.recommendedText}>Khuyên dùng</AppText>
            </View>
          </View>
          <AppText style={styles.methodDesc}>
            Hỗ trợ quét mã VNPAY-QR, thẻ ATM nội địa, Visa, Mastercard
          </AppText>
        </View>
        <ShieldCheck size={20} color="#2e7d32" />
      </View>

      {/* MoMo Option (Coming Soon) */}
      <View style={[styles.methodItem, styles.methodItemDisabled]}>
        <View style={styles.radioCol}>
          <Circle size={20} color={colors.muted} />
        </View>
        <View style={styles.infoCol}>
          <View style={styles.labelRow}>
            <AppText style={[styles.methodName, styles.textDisabled]}>
              Ví điện tử MoMo
            </AppText>
            <View style={styles.comingSoonBadge}>
              <AppText style={styles.comingSoonText}>Sắp có</AppText>
            </View>
          </View>
        </View>
      </View>

      {/* ZaloPay Option (Coming Soon) */}
      <View style={[styles.methodItem, styles.methodItemDisabled]}>
        <View style={styles.radioCol}>
          <Circle size={20} color={colors.muted} />
        </View>
        <View style={styles.infoCol}>
          <View style={styles.labelRow}>
            <AppText style={[styles.methodName, styles.textDisabled]}>
              Ví ZaloPay
            </AppText>
            <View style={styles.comingSoonBadge}>
              <AppText style={styles.comingSoonText}>Sắp có</AppText>
            </View>
          </View>
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  methodItemActive: {
    borderColor: colors.primary,
    backgroundColor: '#fdf8f6',
  },
  methodItemDisabled: {
    backgroundColor: '#fafafa',
    borderColor: '#eee',
    opacity: 0.6,
  },
  radioCol: {
    marginRight: 4,
  },
  infoCol: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  methodName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  methodDesc: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 16,
  },
  recommendedBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
  },
  comingSoonBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
  },
  textDisabled: {
    color: colors.muted,
  },
});
