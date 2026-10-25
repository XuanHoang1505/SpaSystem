import { Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { AppText } from './AppText';
import { colors, spacing, radius } from '@theme/index';
export function AppButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  accessibilityLabel = title,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [styles.button, (pressed || disabled || loading) && styles.dim]}
    >
      {loading ? (
        <ActivityIndicator color={colors.onPrimary} accessibilityLabel="Đang xử lý" />
      ) : (
        <AppText style={styles.text}>{title}</AppText>
      )}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: radius.small,
    backgroundColor: colors.primary,
  },
  text: { color: colors.onPrimary, fontWeight: '600' },
  dim: { opacity: 0.55 },
});
