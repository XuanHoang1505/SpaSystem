import type { PropsWithChildren } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing, radius, shadows } from '@theme/index';
export function AppCard({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}
const styles = StyleSheet.create({
  card: {
    padding: spacing.xl,
    gap: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
});
