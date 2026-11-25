import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react-native';
import { AppButton } from '@components/common/AppButton';
import { AppText } from '@components/common/AppText';
import { formatLocalDate } from '@/lib/formatting/formatters';
import { colors, radius, spacing } from '@theme/index';
import { getDatePresets, groupByOptions, productTypeOptions } from '../utils/reportHelpers';
import { RevenueFilterBar } from './RevenueFilterBar';
import type { ReportProductType, RevenueGroupBy } from '@spa/shared-types';

type Props = {
  fromDate: string;
  toDate: string;
  groupBy: RevenueGroupBy;
  productType: ReportProductType;
  onDateRangeChange: (from: string, to: string) => void;
  onGroupByChange: (groupBy: RevenueGroupBy) => void;
  onProductTypeChange: (productType: ReportProductType) => void;
  onReset: () => void;
};

/** One-line summary of the report filters; tapping it opens every filter in a bottom sheet. */
export function RevenueFilterSheet(props: Props) {
  const { fromDate, toDate, groupBy, productType } = props;
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const preset = getDatePresets().find((p) => p.fromDate === fromDate && p.toDate === toDate);
  // "01/01 – 24/11/2026" within one year keeps the summary on one line.
  const from = formatLocalDate(fromDate);
  const range = `${fromDate.slice(0, 4) === toDate.slice(0, 4) ? from.slice(0, 5) : from} – ${formatLocalDate(toDate)}`;
  const groupLabel = groupByOptions.find((o) => o.value === groupBy)?.label ?? '';
  const productLabel = productTypeOptions.find((o) => o.value === productType)?.label ?? '';
  const details = [
    preset ? range : null,
    `Theo ${groupLabel.toLowerCase()}`,
    // "All products" is the default, so only a narrowed product type is worth the space.
    productType === 'all' ? null : productLabel,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Bộ lọc báo cáo: ${preset?.label ?? range}, ${details}. Chạm để thay đổi`}
        style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
      >
        <View style={styles.summaryIcon}>
          <SlidersHorizontal size={18} color={colors.primary} />
        </View>
        <View style={styles.summaryText}>
          <AppText style={styles.summaryTitle} numberOfLines={1}>
            {preset?.label ?? range}
          </AppText>
          <AppText style={styles.summaryDetails} numberOfLines={1}>
            {details}
          </AppText>
        </View>
        <ChevronDown size={18} color={colors.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable
            style={styles.backdrop}
            onPress={() => setOpen(false)}
            accessibilityLabel="Đóng bộ lọc"
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.sheetHeader}>
              <View style={styles.handle} />
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Đóng bộ lọc"
                style={styles.closeButton}
              >
                <X size={20} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={styles.sheetBody}
              showsVerticalScrollIndicator={false}
            >
              <RevenueFilterBar {...props} />
            </ScrollView>
            <View style={styles.footer}>
              <AppButton title="Xem báo cáo" onPress={() => setOpen(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  pressed: { opacity: 0.85 },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: { flex: 1, gap: 2 },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  summaryDetails: { fontSize: 12, color: colors.muted },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  backdrop: { flex: 1 },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  sheetHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.sm,
    minHeight: 48,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border },
  closeButton: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.xs,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
});
