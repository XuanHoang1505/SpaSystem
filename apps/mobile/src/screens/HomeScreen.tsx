import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { AppCard } from '@components/common/AppCard';
import { AppButton } from '@components/common/AppButton';
import { SystemStatus } from '@components/common/SystemStatus';
import { colors, typography, spacing } from '@theme/index';
export function HomeScreen() {
  return (
    <AppScreen>
      <AppText style={styles.brand}>NHƯ NGUYỆT SPA</AppText>
      <AppText accessibilityRole="header" style={styles.title}>
        Một khoảng lặng, dành riêng cho bạn.
      </AppText>
      <AppText>Nền tảng chăm sóc da và quản lý spa.</AppText>
      <AppCard>
        <AppText>Tính năng đang được phát triển</AppText>
        <AppText style={styles.note}>
          Bản nền tảng · Chưa có xác thực hoặc dữ liệu nghiệp vụ.
        </AppText>
      </AppCard>
      <AppButton title="Khám phá dịch vụ" onPress={() => router.push('/(public)/services')} />
      <AppButton title="Gói chăm sóc" onPress={() => router.push('/(public)/packages')} />
      <AppButton title="Không gian khách hàng" onPress={() => router.push('/(customer)/home')} />
      <AppButton title="Không gian nhân viên" onPress={() => router.push('/(staff)/dashboard')} />
      <AppButton title="Không gian quản lý" onPress={() => router.push('/(owner)/dashboard')} />
      <SystemStatus />
    </AppScreen>
  );
}
const styles = StyleSheet.create({
  brand: {
    color: colors.primary,
    fontSize: typography.small,
    letterSpacing: 2,
    marginTop: spacing.lg,
  },
  title: { fontSize: typography.hero, lineHeight: 44, color: colors.primary },
  note: { color: colors.muted, fontSize: typography.small },
});
