import { Pressable, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { colors, spacing } from '@theme/index';

/** A link-style button ("Quên mật khẩu?", "Đăng ký") with the 48dp touch target. */
export function AppTextButton({
  title,
  onPress,
  disabled = false,
  accessibilityLabel = title,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={spacing.xs}
      style={({ pressed }) => [styles.button, (pressed || disabled) && styles.dim]}
    >
      <AppText style={styles.text}>{title}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.xs },
  text: { color: colors.primary, fontWeight: '600' },
  dim: { opacity: 0.55 },
});
