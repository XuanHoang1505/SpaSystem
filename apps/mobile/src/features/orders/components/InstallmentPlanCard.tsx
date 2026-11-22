import { Pressable, StyleSheet, View } from 'react-native';
import type { InstallmentOption, OrderInstallment, PromotionError } from '@spa/shared-types';
import { CalendarClock } from 'lucide-react-native';
import { AppText } from '@components/common/AppText';
import { formatCurrency } from '@/lib/formatting/formatters';
import { colors, radius, spacing } from '@theme/index';

const sessions = (first: number, last: number) =>
  first === last ? `Buổi ${first}` : `Buổi ${first}–${last}`;

/**
 * "Hình thức thanh toán" of SCR-M19b for a one-package order (docs/specs/order-installments.md): pay in full, or in 2–3
 * installments that each unlock a run of sessions. `value` is the chosen installment count, null = pay in full.
 */
export function InstallmentPlanCard({
  options,
  unavailable,
  value,
  onChange,
  disabled = false,
}: {
  options: readonly InstallmentOption[];
  unavailable: PromotionError | null;
  value: number | null;
  onChange: (installmentCount: number | null) => void;
  disabled?: boolean;
}) {
  const selected = options.find((option) => option.installmentCount === value) ?? null;
  const choices = [
    { key: 'full', count: null, title: 'Trả một lần', hint: undefined },
    ...options.map((option) => ({
      key: String(option.installmentCount),
      count: option.installmentCount,
      title: `Trả ${option.installmentCount} đợt`,
      hint: `Đợt 1: ${formatCurrency(option.installments[0]?.amount ?? 0)}`,
    })),
  ];
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <CalendarClock size={18} color={colors.primary} />
        <AppText style={styles.title}>Hình thức thanh toán</AppText>
      </View>
      <AppText style={styles.muted}>
        Trả theo đợt: mỗi đợt mở khóa một nhóm buổi của gói, trả đến đâu dùng đến đó.
      </AppText>
      <View accessibilityRole="radiogroup" style={styles.choices}>
        {choices.map((choice) => {
          const checked = choice.count === (selected?.installmentCount ?? null);
          return (
            <Pressable
              key={choice.key}
              accessibilityRole="radio"
              accessibilityState={{ checked, disabled }}
              accessibilityLabel={choice.title}
              disabled={disabled}
              onPress={() => onChange(choice.count)}
              style={[styles.choice, checked && styles.choiceChecked]}
            >
              <View style={[styles.radio, checked && styles.radioChecked]} />
              <View style={styles.choiceText}>
                <AppText style={styles.choiceTitle}>{choice.title}</AppText>
                {choice.hint ? <AppText style={styles.muted}>{choice.hint}</AppText> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      {options.length === 0 && unavailable ? (
        <AppText style={styles.muted}>{unavailable.message}</AppText>
      ) : null}
      {selected ? (
        <View style={styles.list}>
          {selected.installments.map((item) => (
            <View key={item.sequenceNumber} style={styles.row}>
              <View style={styles.rowText}>
                <AppText style={styles.choiceTitle}>
                  Đợt {item.sequenceNumber}:{' '}
                  {sessions(item.firstSessionNumber, item.lastSessionNumber)}
                </AppText>
                <AppText style={styles.muted}>
                  {item.services
                    .map((service) => `${service.name} × ${service.sessionCount}`)
                    .join(', ')}
                </AppText>
              </View>
              <AppText style={styles.amount}>{formatCurrency(item.amount)}</AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const STATUS_TEXT: Record<OrderInstallment['status'], string> = {
  pending: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  cancelled: 'Đã hủy',
  expired: 'Hết hạn',
};

/** The installments of an order with their status, and the amount paid and left (order detail, existing-order checkout). */
export function InstallmentScheduleCard({
  installments,
  paidAmount,
  remainingAmount,
}: {
  installments: readonly OrderInstallment[];
  paidAmount: number;
  remainingAmount: number;
}) {
  if (installments.length === 0) return null;
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <CalendarClock size={18} color={colors.primary} />
        <AppText style={styles.title}>Thanh toán theo {installments.length} đợt</AppText>
      </View>
      <AppText style={styles.muted}>
        Đã trả {formatCurrency(paidAmount)}
        {remainingAmount > 0 ? ` · Còn lại ${formatCurrency(remainingAmount)}` : ''}
      </AppText>
      <View style={styles.list}>
        {installments.map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={styles.rowText}>
              <AppText style={styles.choiceTitle}>
                Đợt {item.sequenceNumber}:{' '}
                {sessions(item.firstSessionNumber, item.lastSessionNumber)}
              </AppText>
              <AppText style={item.status === 'paid' ? styles.paid : styles.muted}>
                {STATUS_TEXT[item.status]}
              </AppText>
            </View>
            <AppText style={styles.amount}>{formatCurrency(item.amount)}</AppText>
          </View>
        ))}
      </View>
    </View>
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
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  paid: { fontSize: 13, color: colors.success },
  choices: { gap: spacing.sm },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
  },
  choiceChecked: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border },
  radioChecked: { borderColor: colors.primary, borderWidth: 6 },
  choiceText: { flex: 1, gap: 2 },
  choiceTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  list: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.small },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowText: { flex: 1, gap: 2 },
  amount: { fontSize: 14, fontWeight: '700', color: colors.primary },
});
