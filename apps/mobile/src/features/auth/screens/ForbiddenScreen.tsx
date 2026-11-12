import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ShieldAlert } from 'lucide-react-native';
import { AppButton } from '@components/common/AppButton';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { homePathFor, useAuthStore } from '@/stores/authStore';
import { colors, spacing, typography } from '@theme/index';

/** Shown when a signed-in user opens another role's area. `replace` keeps Android back out of that area. */
export function ForbiddenScreen() {
  const user = useAuthStore((state) => state.user);
  return (
    <AppScreen>
      <View style={styles.body}>
        <ShieldAlert color={colors.primary} size={40} accessibilityElementsHidden />
        <AppText style={styles.code}>403</AppText>
        <AppText accessibilityRole="header" style={styles.title}>
          Không có quyền truy cập
        </AppText>
        <AppText style={styles.description}>Tài khoản của bạn không dùng được khu vực này.</AppText>
      </View>
      {user && (
        <AppButton
          title="Về không gian của tôi"
          onPress={() => router.replace(homePathFor(user.role))}
        />
      )}
      <AppButton title="Về trang chủ" variant="outline" onPress={() => router.replace('/')} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  code: { color: colors.primary, fontSize: typography.small, letterSpacing: 4, fontWeight: '600' },
  title: { fontSize: typography.heading, lineHeight: 34, textAlign: 'center' },
  description: { color: colors.muted, textAlign: 'center' },
});
