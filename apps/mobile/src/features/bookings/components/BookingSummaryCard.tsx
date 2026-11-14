import { StyleSheet, View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { AppText } from '@components/common/AppText';
import { formatCurrency, formatLocalDate } from '@/lib/formatting/formatters';
import { colors, radius, spacing } from '@theme/index';

export function BookingSummaryCard({
  isBookNowFlow,
  serviceName,
  selectedDate,
  selectedStartTime,
  selectedEndTime,
  selectedStaffName,
  price,
}: {
  isBookNowFlow: boolean;
  serviceName: string;
  selectedDate: string;
  selectedStartTime?: string;
  selectedEndTime?: string;
  selectedStaffName: string;
  price: number;
}) {
  return (
    <View style={styles.card}>
      <AppText style={styles.sectionTitle}>Tóm tắt lịch hẹn</AppText>

      <View style={styles.row}>
        <AppText style={styles.label}>Dịch vụ</AppText>
        <AppText style={styles.value} numberOfLines={1}>
          {serviceName}
        </AppText>
      </View>

      <View style={styles.row}>
        <AppText style={styles.label}>Ngày hẹn</AppText>
        <AppText style={styles.value}>{formatLocalDate(selectedDate)}</AppText>
      </View>

      <View style={styles.row}>
        <AppText style={styles.label}>Khung giờ</AppText>
        <AppText style={styles.value}>
          {selectedStartTime
            ? selectedEndTime
              ? `${selectedStartTime} – ${selectedEndTime}`
              : selectedStartTime
            : 'Chưa chọn khung giờ'}
        </AppText>
      </View>

      <View style={styles.row}>
        <AppText style={styles.label}>Kỹ thuật viên</AppText>
        <AppText style={styles.value}>{selectedStaffName}</AppText>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <AppText style={styles.totalLabel}>
          {isBookNowFlow ? 'Giá tạm tính' : 'Thanh toán hôm nay'}
        </AppText>
        <AppText style={styles.totalValue}>
          {isBookNowFlow ? formatCurrency(price) : '0 ₫ (Đã thanh toán)'}
        </AppText>
      </View>

      <View style={styles.policyBox}>
        <ShieldCheck size={16} color={colors.primary} />
        <AppText style={styles.policyText}>
          {isBookNowFlow
            ? 'Lịch hẹn sẽ được giữ chỗ 15 phút để thanh toán.'
            : 'Lịch hẹn sẽ được xác nhận ngay mà không cần thanh toán thêm. Hỗ trợ đổi hoặc hủy trực tuyến trước giờ hẹn tối thiểu 24 giờ.'}
        </AppText>
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
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: 3,
  },
  label: {
    fontSize: 13,
    color: colors.muted,
  },
  value: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surface,
    marginVertical: spacing.xs,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  policyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.small,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  policyText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.text,
  },
});
