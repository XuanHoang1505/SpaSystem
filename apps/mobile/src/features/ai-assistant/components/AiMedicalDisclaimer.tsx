import { StyleSheet, View } from 'react-native';
import { ShieldAlert } from 'lucide-react-native';
import { AppText } from '@components/common/AppText';
import { colors, radius, spacing } from '@theme/index';

export function AiMedicalDisclaimer() {
  return (
    <View style={styles.container} accessibilityRole="text">
      <ShieldAlert size={16} color={colors.warning} style={styles.icon} />
      <AppText style={styles.text}>
        Lưu ý: Trợ lý AI chỉ tư vấn thông tin dịch vụ, gói và hỗ trợ chọn lịch tại Spa Như Nguyệt;
        không đưa ra chẩn đoán y khoa hay thay thế bác sĩ da liễu.
      </AppText>
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
    borderRadius: radius.small,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  icon: {
    marginTop: 2,
  },
  text: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: colors.warning,
    fontWeight: '500',
  },
});
