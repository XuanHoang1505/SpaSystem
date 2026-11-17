import { StyleSheet, View } from 'react-native';
import { colors, radius, shadows, spacing } from '@theme/index';

export function ReportSkeleton() {
  return (
    <View style={styles.container}>
      {/* KPI 1: Highlight card */}
      <View style={[styles.card, styles.highlightSkeleton]}>
        <View style={styles.skeletonLineShort} />
        <View style={styles.skeletonLineLarge} />
        <View style={styles.skeletonLineTiny} />
      </View>

      {/* KPI 2 & 3: Half cards */}
      <View style={styles.row}>
        <View style={[styles.card, styles.halfCard]}>
          <View style={styles.skeletonLineShort} />
          <View style={styles.skeletonLineMedium} />
        </View>
        <View style={[styles.card, styles.halfCard]}>
          <View style={styles.skeletonLineShort} />
          <View style={styles.skeletonLineMedium} />
        </View>
      </View>

      {/* KPI 4: Single row card */}
      <View style={[styles.card, styles.singleCard]}>
        <View style={styles.skeletonLineShort} />
        <View style={styles.skeletonLineSmall} />
      </View>

      {/* Chart Skeleton */}
      <View style={[styles.card, styles.chartSkeleton]}>
        <View style={styles.skeletonLineShort} />
        <View style={styles.chartBarsSkeleton}>
          <View style={[styles.barGhost, { height: 60 }]} />
          <View style={[styles.barGhost, { height: 110 }]} />
          <View style={[styles.barGhost, { height: 80 }]} />
          <View style={[styles.barGhost, { height: 130 }]} />
          <View style={[styles.barGhost, { height: 95 }]} />
        </View>
      </View>

      {/* Top Products Skeleton */}
      <View style={[styles.card, styles.topProductsSkeleton]}>
        <View style={styles.skeletonLineShort} />
        <View style={styles.productRowGhost} />
        <View style={styles.productRowGhost} />
        <View style={styles.productRowGhost} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.card,
  },
  highlightSkeleton: {
    height: 120,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfCard: {
    flex: 1,
    height: 90,
    justifyContent: 'center',
  },
  singleCard: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chartSkeleton: {
    height: 200,
    justifyContent: 'space-between',
  },
  chartBarsSkeleton: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 140,
    paddingHorizontal: spacing.md,
  },
  barGhost: {
    width: 28,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  topProductsSkeleton: {
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  productRowGhost: {
    height: 40,
    borderRadius: radius.small,
    backgroundColor: colors.neutralSoft,
  },
  skeletonLineTiny: {
    height: 10,
    width: '40%',
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  skeletonLineSmall: {
    height: 14,
    width: '30%',
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  skeletonLineShort: {
    height: 12,
    width: '50%',
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  skeletonLineMedium: {
    height: 20,
    width: '70%',
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  skeletonLineLarge: {
    height: 28,
    width: '60%',
    borderRadius: 4,
    backgroundColor: colors.border,
  },
});
