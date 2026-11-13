import { StyleSheet, View } from 'react-native';
import type { ServiceStep } from '@spa/shared-types';
import { AppText } from '@components/common/AppText';
import { colors, radius, spacing } from '@theme/index';

export function ServiceStepItem({ step }: { step: ServiceStep }) {

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.numberBadge}>
          <AppText style={styles.numberText}>{step.sortOrder}</AppText>
        </View>

        <AppText style={styles.title}>{step.title}</AppText>

        {step.durationMinutes !== null && step.durationMinutes !== undefined && (
          <View style={styles.durationContainer}>
            <View style={styles.durationBadge}>
              <AppText style={styles.durationText}>{step.durationMinutes} phút</AppText>
            </View>
          </View>
        )}
      </View>

      {step.description && (
        <AppText style={styles.description}>{step.description}</AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eee7e1',
    borderRadius: 16,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginLeft: spacing.sm,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationBadge: {
    backgroundColor: '#f5eee8',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: radius.small,
  },
  durationText: {
    fontSize: 11,
    color: '#7a685e',
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    color: '#6c625c',
    marginTop: spacing.xs,
    marginLeft: 32,
  },
});