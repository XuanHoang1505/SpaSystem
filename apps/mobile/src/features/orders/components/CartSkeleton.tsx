import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@theme/index';

export function CartSkeleton() {
  return (
    <View style={styles.container}>
      {[1, 2, 3].map((key) => (
        <View key={key} style={styles.card}>
          <View style={styles.imagePlaceholder} />
          <View style={styles.content}>
            <View style={styles.badgePlaceholder} />
            <View style={styles.titlePlaceholder} />
            <View style={styles.pricePlaceholder} />
          </View>
          <View style={styles.btnPlaceholder} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee7e1',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    opacity: 0.6,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: radius.small,
    backgroundColor: colors.border,
  },
  content: {
    flex: 1,
    gap: 6,
  },
  badgePlaceholder: {
    width: 60,
    height: 16,
    borderRadius: 9999,
    backgroundColor: colors.border,
  },
  titlePlaceholder: {
    width: '85%',
    height: 16,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  pricePlaceholder: {
    width: 80,
    height: 18,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  btnPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
  },
});
