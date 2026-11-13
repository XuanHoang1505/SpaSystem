import { Image, Pressable, StyleSheet, View } from 'react-native';
import type { PackageListItem } from '@spa/shared-types';
import { ArrowRight, Calendar, Layers, Sparkles, Star } from 'lucide-react-native';
import { AppText } from '@components/common/AppText';
import { formatCurrency } from '@/lib/formatting/formatters';
import { colors, radius, spacing } from '@theme/index';

export function PackageCard({
  pkg,
  onPress,
}: {
  pkg: PackageListItem;
  onPress: () => void;
}) {
  const isDiscontinued = pkg.status === 'discontinued';
  const hasSavings = pkg.retailPrice > pkg.price;
  const savingsPercent = hasSavings
    ? Math.round(((pkg.retailPrice - pkg.price) / pkg.retailPrice) * 100)
    : 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Gói dịch vụ ${pkg.name}, ${pkg.totalSessions} buổi, giá ${formatCurrency(pkg.price)}`}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {/* Top Row: Thumbnail + Info */}
      <View style={styles.topRow}>
        <View style={styles.imageContainer}>
          {pkg.imageUrl ? (
            <Image
              source={{ uri: pkg.imageUrl }}
              style={styles.image}
              resizeMode="cover"
              accessibilityLabel={pkg.name}
            />
          ) : (
            <View style={styles.imageFallback}>
              <Sparkles size={28} color={colors.primary} />
            </View>
          )}
          {isDiscontinued && (
            <View style={styles.discontinuedBadge}>
              <AppText style={styles.discontinuedText}>Ngừng bán</AppText>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Badge Row */}
          <View style={styles.badgeRow}>
            <View style={styles.categoryBadge}>
              <AppText style={styles.categoryText}>Gói Liệu Trình</AppText>
            </View>
            <View style={styles.ratingBadge}>
              <Star size={12} color="#df8543" fill="#df8543" />
              <AppText style={styles.ratingText}>5.0 (90+)</AppText>
            </View>
          </View>

          {/* Title */}
          <AppText numberOfLines={1} style={styles.title}>
            {pkg.name}
          </AppText>

          {/* Sessions & Validity row */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Layers size={12} color={colors.primary} />
              <AppText style={styles.metaText}>{pkg.totalSessions} buổi</AppText>
            </View>
            <View style={styles.metaItem}>
              <Calendar size={12} color={colors.muted} />
              <AppText style={styles.metaText}>{pkg.validityDays} ngày</AppText>
            </View>
          </View>

          {/* Short description */}
          <AppText numberOfLines={2} style={styles.shortDescription}>
            {pkg.shortDescription ||
              'Liệu trình trọn gói chuyên sâu, cam kết hiệu quả rõ rệt theo từng buổi điều trị.'}
          </AppText>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Bottom Row */}
      <View style={styles.bottomRow}>
        <View style={styles.priceColumn}>
          <AppText style={styles.priceLabel}>GIÁ TRỌN GÓI</AppText>
          <View style={styles.priceWithDiscountRow}>
            <AppText style={styles.priceValue}>{formatCurrency(pkg.price)}</AppText>
            {hasSavings && (
              <AppText style={styles.retailPrice}>
                {formatCurrency(pkg.retailPrice)}
              </AppText>
            )}
            {hasSavings && (
              <View style={styles.savingsBadge}>
                <AppText style={styles.savingsText}>-{savingsPercent}%</AppText>
              </View>
            )}
          </View>
        </View>

        <View
          style={[
            styles.actionButton,
            isDiscontinued && styles.actionButtonDisabled,
          ]}
        >
          <AppText
            style={[
              styles.actionButtonText,
              isDiscontinued && styles.actionButtonTextDisabled,
            ]}
          >
            {isDiscontinued ? 'Tạm ngưng' : 'Xem gói'}
          </AppText>
          {!isDiscontinued && <ArrowRight size={14} color={colors.onPrimary} />}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#eee7e1',
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  topRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  imageContainer: {
    width: 88,
    height: 88,
    borderRadius: radius.small,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f5ede6',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discontinuedBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(52, 46, 48, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discontinuedText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    gap: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  categoryBadge: {
    backgroundColor: '#e6ede8',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 9999,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2e593f',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6c625c',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 12,
    color: colors.muted,
  },
  shortDescription: {
    fontSize: 12,
    lineHeight: 16,
    color: '#7a7067',
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
  priceColumn: {
    gap: 2,
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9e948a',
    letterSpacing: 0.5,
  },
  priceWithDiscountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  retailPrice: {
    fontSize: 12,
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  savingsBadge: {
    backgroundColor: '#fae8eb',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.error,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9999,
    minHeight: 40,
  },
  actionButtonDisabled: {
    backgroundColor: '#e5dadb',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  actionButtonTextDisabled: {
    color: colors.muted,
  },
});