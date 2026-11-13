import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@theme/index';

export function PackageSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.imagePlaceholder} />
        <View style={styles.content}>
          <View style={styles.badgeRow}>
            <View style={styles.badgePlaceholder} />
            <View style={styles.ratingPlaceholder} />
          </View>
          <View style={styles.titlePlaceholder} />
          <View style={styles.metaPlaceholder} />
          <View style={styles.descPlaceholder} />
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.bottomRow}>
        <View style={styles.pricePlaceholder} />
        <View style={styles.btnPlaceholder} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#eee7e1',
    padding: spacing.md,
    opacity: 0.6,
  },
  topRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  imagePlaceholder: {
    width: 88,
    height: 88,
    borderRadius: radius.small,
    backgroundColor: colors.border,
  },
  content: {
    flex: 1,
    gap: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badgePlaceholder: {
    width: 80,
    height: 18,
    borderRadius: 9999,
    backgroundColor: colors.border,
  },
  ratingPlaceholder: {
    width: 50,
    height: 18,
    borderRadius: 9999,
    backgroundColor: colors.border,
  },
  titlePlaceholder: {
    width: '85%',
    height: 18,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  metaPlaceholder: {
    width: '60%',
    height: 14,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  descPlaceholder: {
    width: '100%',
    height: 24,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0e9e2',
    marginVertical: spacing.sm,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pricePlaceholder: {
    width: 100,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  btnPlaceholder: {
    width: 90,
    height: 38,
    borderRadius: 9999,
    backgroundColor: colors.border,
  },
});