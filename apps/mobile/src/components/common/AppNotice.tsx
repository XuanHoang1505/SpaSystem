import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { colors, radius, spacing, typography } from '@theme/index';

export type NoticeTone = 'error' | 'info' | 'success';

const toneColor: Record<NoticeTone, string> = {
  error: colors.error,
  info: colors.primary,
  success: colors.success,
};

/** Inline message announced to screen readers (the mobile counterpart of the web `Alert`). */
export function AppNotice({
  tone = 'info',
  title,
  message,
}: {
  tone?: NoticeTone;
  title?: string;
  message: string;
}) {
  const color = toneColor[tone];
  return (
    <View accessible accessibilityRole="alert" style={[styles.box, { borderColor: color }]}>
      {title && <AppText style={[styles.title, { color }]}>{title}</AppText>}
      <AppText style={styles.message}>{message}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.small,
    backgroundColor: colors.surface,
  },
  title: { fontWeight: '600' },
  message: { fontSize: typography.small, lineHeight: 21 },
});
