import { useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { AppScreen } from '@components/common/AppScreen';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing } from '@theme/index';
import { ChangePasswordForm } from '../components/ChangePasswordForm';
import { FlowHeader } from '../components/FlowHeader';

/** Root stack screen, same shell as cart and checkout. */
export function PasswordScreen() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/(public)/login?redirect=/password');
    }
  }, [status]);

  if (status !== 'authenticated' || !user) return null;

  return (
    <AppScreen scroll={false} style={styles.screen}>
      <FlowHeader title="Đổi mật khẩu" />
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <ChangePasswordForm />
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  fill: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.xl, gap: spacing.lg },
});
