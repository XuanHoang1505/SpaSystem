import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { PackagePayment } from '@spa/shared-types';
import { CalendarClock } from 'lucide-react-native';
import { AppButton } from '@components/common/AppButton';
import { AppText } from '@components/common/AppText';
import { formatCurrency } from '@/lib/formatting/formatters';
import { colors, radius, spacing } from '@theme/index';

/**
 * Payment progress of a package bought in installments (BR-INS-06): which sessions are paid, and a button to pay the next
 * installment (the checkout of the existing order). Renders nothing for a package paid in full.
 */
export function InstallmentPaymentNotice({ payment }: { payment: PackagePayment | null }) {
  if (!payment || payment.plan !== 'installment') return null;
  const next = payment.nextInstallment;
  const paidAll = payment.paidSessionCount >= payment.totalSessions;
  return (
    <View style={[styles.box, next ? styles.boxActive : null]}>
      <View style={styles.row}>
        <CalendarClock size={18} color={colors.primary} />
        <View style={styles.text}>
          <AppText style={styles.title}>
            {paidAll
              ? 'Đã thanh toán đủ các buổi của gói.'
              : `Thanh toán theo đợt: đã trả ${payment.paidSessionCount}/${payment.totalSessions} buổi.`}
          </AppText>
          {next ? (
            <AppText style={styles.muted}>
              Thanh toán đợt {next.sequenceNumber} để mở buổi {next.firstSessionNumber}–
              {next.lastSessionNumber}.
            </AppText>
          ) : null}
        </View>
      </View>
      {next ? (
        <AppButton
          title={`Thanh toán đợt ${next.sequenceNumber} (${formatCurrency(next.amount)})`}
          onPress={() => router.push(`/checkout?orderId=${next.orderId}`)}
          accessibilityLabel={`Thanh toán đợt ${next.sequenceNumber}`}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  boxActive: { borderColor: colors.infoBorder, backgroundColor: colors.infoSoft },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontWeight: '600', color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
});
