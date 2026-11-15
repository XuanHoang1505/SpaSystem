import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Package, Sparkles } from 'lucide-react-native';
import type { AiProductSuggestion } from '@spa/shared-types';
import { AppText } from '@components/common/AppText';
import { formatCurrency } from '@/lib/formatting/formatters';
import { colors, radius, spacing } from '@theme/index';

export function AiProductSuggestionCard({ suggestion }: { suggestion: AiProductSuggestion }) {
  const router = useRouter();
  const isPackage = suggestion.productType === 'package';

  const handlePress = () => {
    const targetUrl = isPackage
      ? `/(public)/packages/${suggestion.productId}`
      : `/(public)/services/${suggestion.productId}`;
    router.push(targetUrl as any);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Gợi ý: ${suggestion.name}, giá ${formatCurrency(suggestion.price)}`}
    >
      <View style={styles.iconWrap}>
        {isPackage ? (
          <Package size={18} color={colors.primary} />
        ) : (
          <Sparkles size={18} color={colors.primary} />
        )}
      </View>

      <View style={styles.infoCol}>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, isPackage && styles.packageBadge]}>
            <AppText style={[styles.badgeText, isPackage && styles.packageBadgeText]}>
              {isPackage ? 'Gói liệu trình' : 'Dịch vụ lẻ'}
            </AppText>
          </View>
        </View>
        <AppText style={styles.name} numberOfLines={1}>
          {suggestion.name}
        </AppText>
        <AppText style={styles.price}>{formatCurrency(suggestion.price)}</AppText>
      </View>

      <ChevronRight size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cardPressed: {
    opacity: 0.85,
    backgroundColor: colors.surface,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  packageBadge: {
    backgroundColor: '#ede9fe',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  packageBadgeText: {
    color: '#6d28d9',
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  price: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
});
