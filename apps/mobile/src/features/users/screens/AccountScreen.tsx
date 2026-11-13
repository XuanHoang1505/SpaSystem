import { useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { AppButton } from '@components/common/AppButton';
import { AppLoader } from '@components/common/AppLoader';
import { AppNotice } from '@components/common/AppNotice';
import { AppScreen } from '@components/common/AppScreen';
import { authErrorMessage } from '@features/auth/errors';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing } from '@theme/index';
import { FlowHeader } from '../components/FlowHeader';
import { AccountPanel } from '../components/AccountPanel';
import { useMe } from '../hooks/useMe';

/** Root stack screen, same shell as cart and checkout. */
export function AccountScreen() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/(public)/login?redirect=/account');
    }
  }, [status]);

  if (status !== 'authenticated' || !user) return null;
  return <AccountEditor />;
}

function AccountEditor() {
  const me = useMe();

  return (
    <AppScreen scroll={false} style={styles.screen}>
      <FlowHeader title="Thông tin cá nhân" />
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {me.isPending ? <AppLoader /> : null}
        {me.isError ? (
          <>
            <AppNotice tone="error" message={authErrorMessage(me.error)} />
            <AppButton title="Thử lại" onPress={() => void me.refetch()} />
          </>
        ) : null}
        {me.data ? <AccountPanel me={me.data} /> : null}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  fill: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.xl, gap: spacing.lg },
});
