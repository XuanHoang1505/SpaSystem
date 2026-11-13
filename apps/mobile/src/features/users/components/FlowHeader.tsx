import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@components/common/AppText';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing } from '@theme/index';

/** Same back-and-title bar as the cart and checkout screens. */
export function FlowHeader({ title }: { title: string }) {
  const insets = useSafeAreaInsets();

  function leave() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    const role = useAuthStore.getState().user?.role;
    if (role === 'staff') router.replace('/(staff)/profile');
    else if (role === 'owner') router.replace('/(owner)/profile');
    else router.replace('/(customer)/profile');
  }

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
      <Pressable
        onPress={leave}
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        hitSlop={8}
        style={styles.backButton}
      >
        <ArrowLeft size={22} color={colors.text} />
      </Pressable>
      <AppText style={styles.headerTitle}>{title}</AppText>
      <View style={styles.headerSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  headerSpacer: {
    width: 48,
  },
});
