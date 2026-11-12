import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { AppButton } from '@components/common/AppButton';
import { AppLoader } from '@components/common/AppLoader';
import { SystemStatus } from '@components/common/SystemStatus';
import { homePathFor, useAuthStore } from '@/stores/authStore';
import { colors, typography, spacing } from '@theme/index';

export function HomeScreen() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  return (
    <AppScreen>
      <AppText style={styles.brand}>NHƯ NGUYỆT SPA</AppText>
      <AppText accessibilityRole="header" style={styles.title}>
        Một khoảng lặng, dành riêng cho bạn.
      </AppText>
      <AppText>Nền tảng chăm sóc da và quản lý spa.</AppText>
      {status === 'restoring' ? (
        <AppLoader />
      ) : user ? (
        <>
          <AppText style={styles.greeting}>{`Xin chào, ${user.fullName}`}</AppText>
          <AppButton
            title="Vào không gian của tôi"
            onPress={() => router.push(homePathFor(user.role))}
          />
        </>
      ) : (
        <>
          <AppButton title="Đăng nhập" onPress={() => router.push('/(public)/login')} />
          <AppButton
            title="Đăng ký"
            variant="outline"
            onPress={() => router.push('/(public)/register')}
          />
        </>
      )}
      <AppButton
        title="Khám phá dịch vụ"
        variant="outline"
        onPress={() => router.push('/(public)/services')}
      />
      <AppButton
        title="Gói chăm sóc"
        variant="outline"
        onPress={() => router.push('/(public)/packages')}
      />
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
  greeting: { fontWeight: '600' },
});
