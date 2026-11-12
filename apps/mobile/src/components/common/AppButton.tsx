import { Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { AppText } from './AppText';
import { colors, spacing, radius } from '@theme/index';
export function AppButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  accessibilityLabel = title,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** `outline` is the secondary action next to a primary button. */
  variant?: 'primary' | 'outline';
  accessibilityLabel?: string;
}) {
  const outline = variant === 'outline';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        outline && styles.outline,
        (pressed || disabled || loading) && styles.dim,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={outline ? colors.primary : colors.onPrimary}
          accessibilityLabel="Đang xử lý"
        />
      ) : (
        <AppText style={[styles.text, outline && styles.outlineText]}>{title}</AppText>
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
  outline: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
  text: { color: colors.onPrimary, fontWeight: '600' },
  outlineText: { color: colors.primary },
  dim: { opacity: 0.55 },
});
