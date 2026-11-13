import { Image, Pressable, StyleSheet, View } from 'react-native';
import type { CartItem } from '@spa/shared-types';
import { Sparkles, Trash2 } from 'lucide-react-native';
import { AppText } from '@components/common/AppText';
import { formatCurrency } from '@/lib/formatting/formatters';
import { colors, radius, spacing } from '@theme/index';

export function CartItemCard({
  item,
  onRemove,
  isRemoving = false,
}: {
  item: CartItem;
  onRemove: (itemId: string, name: string) => void;
  isRemoving?: boolean;
}) {
  const isPackage = item.type === 'package';
  const isUnavailable = !item.isAvailable;

  return (
    <View style={[styles.card, isUnavailable && styles.cardUnavailable]}>
      {/* Thumbnail */}
      <View style={styles.imageContainer}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.image}
            resizeMode="cover"
            accessibilityLabel={item.name}
          />
        ) : (
          <View style={styles.imageFallback}>
            <Sparkles size={24} color={colors.primary} />
          </View>
        )}
        {isUnavailable && (
          <View style={styles.discontinuedBadge}>
            <AppText style={styles.discontinuedText}>Ngừng bán</AppText>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.typeBadgeRow}>
          <View style={[styles.typeBadge, isPackage ? styles.typeBadgePackage : styles.typeBadgeService]}>
            <AppText
              style={[
                styles.typeBadgeText,
                isPackage ? styles.typeBadgeTextPackage : styles.typeBadgeTextService,
              ]}
            >
              {isPackage ? 'Gói liệu trình' : 'Dịch vụ'}
            </AppText>
          </View>
        </View>

        <AppText numberOfLines={2} style={styles.title}>
          {item.name}
        </AppText>

        <View style={styles.priceRow}>
          <AppText style={styles.currentPrice}>
            {formatCurrency(item.currentPrice)}
          </AppText>
        </View>

        {item.priceChanged && (
          <AppText style={styles.priceChangedText}>
            Giá đã đổi (lúc thêm: {formatCurrency(item.unitPrice)})
          </AppText>
        )}

        {isUnavailable && (
          <AppText style={styles.unavailableNotice}>
            Sản phẩm này không còn bán, hãy xóa khỏi giỏ
          </AppText>
        )}
      </View>

      {/* Remove Button */}
      <Pressable
        onPress={() => onRemove(item.id, item.name)}
        disabled={isRemoving}
        accessibilityRole="button"
        accessibilityLabel={`Xóa ${item.name} khỏi giỏ hàng`}
        hitSlop={8}
        style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}
      >
        <Trash2 size={18} color={colors.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee7e1',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardUnavailable: {
    opacity: 0.65,
    backgroundColor: '#faf6f6',
  },
  imageContainer: {
    width: 80,
    height: 80,
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
    borderRadius: 4,
  },
  discontinuedText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    gap: 3,
  },
  typeBadgeRow: {
    flexDirection: 'row',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  typeBadgeService: {
    backgroundColor: '#e6ede8',
  },
  typeBadgePackage: {
    backgroundColor: '#fae8eb',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  typeBadgeTextService: {
    color: '#2e593f',
  },
  typeBadgeTextPackage: {
    color: '#8d2b45',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  priceChangedText: {
    fontSize: 11,
    color: '#b25e24',
    fontStyle: 'italic',
  },
  unavailableNotice: {
    fontSize: 11,
    color: colors.error,
    fontWeight: '500',
  },
  deleteButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  deleteButtonPressed: {
    backgroundColor: '#f6ece6',
  },
});
