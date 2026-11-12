import type { ReactNode, Ref } from 'react';
import { View, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { AppText } from './AppText';
import { colors, spacing, radius, typography } from '@theme/index';

export function AppInput({
  label,
  hideLabel = false,
  error,
  hint,
  leading,
  trailing,
  style,
  ref,
  ...props
}: TextInputProps & {
  label: string;
  hideLabel?: boolean;
  error?: string;
  hint?: string;
  /** A control inside the field on the left, e.g. an icon. */
  leading?: ReactNode;
  /** A control inside the field on the right, e.g. the show/hide password button. */
  trailing?: ReactNode;
  ref?: Ref<TextInput>;
}) {
  return (
    <View style={styles.field}>
      {!hideLabel && <AppText>{label}</AppText>}
      <View style={[styles.box, error && styles.invalid, props.editable === false && styles.dim]}>
        {leading && <View style={styles.leading}>{leading}</View>}
        <TextInput
          placeholder={props.placeholder ?? label}
          placeholderTextColor={colors.muted}
          {...props}
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={hint}
          style={[styles.input, style]}
        />
        {trailing}
      </View>
      {hint && !error && <AppText style={styles.hint}>{hint}</AppText>}
      {error && (
        <AppText accessibilityRole="alert" style={styles.error}>
          {error}
        </AppText>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  box: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.small,
  },
  leading: {
    paddingLeft: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 48,
    padding: spacing.md,
    fontSize: typography.body,
    color: colors.text,
  },
  invalid: { borderColor: colors.error },
  dim: { opacity: 0.7 },
  hint: { color: colors.muted, fontSize: typography.small },
  error: { color: colors.error, fontSize: typography.small },
});
