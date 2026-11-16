import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Sparkles, Package, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import type { ReviewableProduct } from '@spa/shared-types';
import { AppText } from '@components/common/AppText';
import { AppButton } from '@components/common/AppButton';
import { colors } from '@/theme/colors';
import { reviewIneligibilityLabels } from '../utils/reviewHelpers';

interface Props {
  item: ReviewableProduct;
  onReview: (item: ReviewableProduct) => void;
  onViewReviewed?: () => void;
}

export function ReviewableProductCard({ item, onReview, onViewReviewed }: Props) {
  const { productType, name, imageUrl, eligible, reason } = item;
  const isPackage = productType === 'package';

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        {/* Product Image or Fallback Icon */}
        <View style={styles.imageWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.fallbackIcon}>
              {isPackage ? (
                <Package size={24} color={colors.primary} />
              ) : (
                <Sparkles size={24} color={colors.primary} />
              )}
            </View>
          )}
        </View>

        {/* Info Column */}
        <View style={styles.infoCol}>
          <View style={styles.badgeRow}>
            <View style={[styles.typeBadge, isPackage && styles.packageBadge]}>
              <AppText style={[styles.typeBadgeText, isPackage && styles.packageBadgeText]}>
                {isPackage ? 'Gói liệu trình' : 'Dịch vụ lẻ'}
              </AppText>
            </View>
          </View>

          <AppText style={styles.productName} numberOfLines={2}>
            {name}
          </AppText>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Action / Eligibility Status */}
      <View style={styles.footerRow}>
        {eligible ? (
          <View style={styles.actionWrap}>
            <AppButton
              title="Viết đánh giá"
              onPress={() => onReview(item)}
            />
          </View>
        ) : reason === 'already_reviewed' ? (
          <View style={styles.reviewedRow}>
            <View style={styles.reviewedBadge}>
              <CheckCircle2 size={13} color={colors.success} />
              <AppText style={styles.reviewedText}>Đã gửi đánh giá</AppText>
            </View>
            {onViewReviewed ? (
              <Pressable
                onPress={onViewReviewed}
                accessibilityRole="button"
                accessibilityLabel="Xem lại đánh giá đã gửi"
                hitSlop={8}
              >
                <AppText style={styles.viewLinkText}>Xem đánh giá</AppText>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.ineligibleBadge}>
            <AlertCircle size={13} color={colors.muted} />
            <AppText style={styles.ineligibleText}>
              {reason ? reviewIneligibilityLabels[reason] : 'Chưa đủ điều kiện'}
            </AppText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  imageWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.primarySoft,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallbackIcon: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  typeBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  packageBadge: {
    backgroundColor: '#EDE9FE',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryPressed,
  },
  packageBadgeText: {
    color: '#6D28D9',
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  actionWrap: {
    alignSelf: 'flex-end',
  },
  reviewedRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reviewedText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  viewLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  ineligibleBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ineligibleText: {
    fontSize: 12,
    color: colors.muted,
    flex: 1,
  },
});
