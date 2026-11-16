import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Star, Sparkles } from 'lucide-react-native';
import type { PublicReview } from '@spa/shared-types';
import { AppText } from '@components/common/AppText';
import { colors } from '@/theme/colors';
import { formatReviewDate } from '../utils/reviewHelpers';

interface Props {
  review: PublicReview;
  onPressImage: (url: string) => void;
}

export function PublicReviewCard({ review, onPressImage }: Props) {
  const {
    rating,
    comment,
    imageUrl,
    reviewerName,
    createdAtUtc,
    ownerReply,
    repliedAtUtc,
  } = review;

  const initials = reviewerName
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(-2)
    .join('')
    .toUpperCase();

  return (
    <View style={styles.card}>
      {/* Header: User avatar, name, date, stars */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <AppText style={styles.avatarText}>{initials || 'KH'}</AppText>
        </View>

        <View style={styles.userInfo}>
          <AppText style={styles.reviewerName}>{reviewerName}</AppText>
          <AppText style={styles.reviewDate}>{formatReviewDate(createdAtUtc)}</AppText>
        </View>

        <View style={styles.starsRow} accessibilityRole="text" accessibilityLabel={`${rating} trên 5 sao`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={14}
              color={star <= rating ? '#F59E0B' : colors.border}
              fill={star <= rating ? '#F59E0B' : 'transparent'}
            />
          ))}
        </View>
      </View>

      {/* Review Comment */}
      {comment ? <AppText style={styles.comment}>{comment}</AppText> : null}

      {/* Attached Customer Image */}
      {imageUrl ? (
        <Pressable
          onPress={() => onPressImage(imageUrl)}
          style={styles.imageWrap}
          accessibilityRole="button"
          accessibilityLabel="Chạm để xem ảnh chụp của khách"
        >
          <Image
            source={{ uri: imageUrl }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        </Pressable>
      ) : null}

      {/* Spa Owner Reply Block */}
      {ownerReply ? (
        <View style={styles.replyBox}>
          <View style={styles.replyHeader}>
            <Sparkles size={13} color={colors.primary} />
            <AppText style={styles.replyTitle}>Phản hồi từ Như Nguyệt Spa</AppText>
            {repliedAtUtc ? (
              <AppText style={styles.replyDate}>· {formatReviewDate(repliedAtUtc)}</AppText>
            ) : null}
          </View>
          <AppText style={styles.replyText}>{ownerReply}</AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryPressed,
  },
  userInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  reviewDate: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  comment: {
    fontSize: 13.5,
    color: colors.text,
    lineHeight: 20,
  },
  imageWrap: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnail: {
    width: 80,
    height: 80,
  },
  replyBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    padding: 12,
    gap: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  replyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryPressed,
  },
  replyDate: {
    fontSize: 11,
    color: colors.muted,
  },
  replyText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
