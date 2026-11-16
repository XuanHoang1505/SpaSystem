import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Star, Sparkles, MessageCircle } from 'lucide-react-native';
import type { MyReview } from '@spa/shared-types';
import { AppText } from '@components/common/AppText';
import { AppButton } from '@components/common/AppButton';
import { colors } from '@/theme/colors';
import { formatReviewDate } from '../utils/reviewHelpers';

interface Props {
  review: MyReview;
  onEdit: (review: MyReview) => void;
  onPressImage: (url: string) => void;
}

export function MyReviewCard({ review, onEdit, onPressImage }: Props) {
  const {
    productName,
    productType,
    rating,
    comment,
    imageUrl,
    status,
    ownerReply,
    repliedAtUtc,
    createdAtUtc,
    canEdit,
    editDeadlineAtUtc,
  } = review;

  const isVisible = status === 'visible';

  return (
    <View style={styles.card}>
      {/* Product Title and Status Badge */}
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <View style={styles.typeTag}>
            <AppText style={styles.typeTagText}>
              {productType === 'package' ? 'Gói liệu trình' : 'Dịch vụ lẻ'}
            </AppText>
          </View>
          <AppText style={styles.productName}>{productName}</AppText>
        </View>

        <View style={[styles.statusBadge, isVisible ? styles.statusVisible : styles.statusHidden]}>
          <AppText style={[styles.statusText, isVisible ? styles.statusTextVisible : styles.statusTextHidden]}>
            {isVisible ? 'Công khai' : 'Tạm ẩn'}
          </AppText>
        </View>
      </View>

      {/* Rating Stars & Created Date */}
      <View style={styles.ratingRow}>
        <View style={styles.starsRow} accessibilityRole="text" accessibilityLabel={`${rating} trên 5 sao`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={15}
              color={star <= rating ? '#F59E0B' : colors.border}
              fill={star <= rating ? '#F59E0B' : 'transparent'}
            />
          ))}
        </View>
        <AppText style={styles.dateText}>{formatReviewDate(createdAtUtc)}</AppText>
      </View>

      {/* Review Comment */}
      {comment ? <AppText style={styles.commentText}>{comment}</AppText> : null}

      {/* Attached Customer Image */}
      {imageUrl ? (
        <Pressable
          onPress={() => onPressImage(imageUrl)}
          style={styles.imageWrap}
          accessibilityRole="button"
          accessibilityLabel="Chạm để xem ảnh chụp của bạn"
        >
          <Image source={{ uri: imageUrl }} style={styles.thumbnail} resizeMode="cover" />
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

      <View style={styles.divider} />

      {/* Footer / Edit Action */}
      <View style={styles.footerRow}>
        {canEdit ? (
          <View style={styles.editActionWrap}>
            {editDeadlineAtUtc ? (
              <AppText style={styles.deadlineNotice}>
                Có thể sửa đến {formatReviewDate(editDeadlineAtUtc)}
              </AppText>
            ) : null}
            <AppButton
              title="Chỉnh sửa"
              variant="outline"
              onPress={() => onEdit(review)}
            />
          </View>
        ) : ownerReply ? (
          <View style={styles.noticeWrap}>
            <MessageCircle size={13} color={colors.muted} />
            <AppText style={styles.lockNotice}>Đánh giá đã được spa phản hồi.</AppText>
          </View>
        ) : (
          <AppText style={styles.lockNotice}>Đã quá thời hạn chỉnh sửa (30 ngày).</AppText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  titleCol: {
    flex: 1,
    gap: 4,
  },
  typeTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusVisible: {
    backgroundColor: colors.successSoft,
  },
  statusHidden: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextVisible: {
    color: colors.success,
  },
  statusTextHidden: {
    color: colors.muted,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  dateText: {
    fontSize: 12,
    color: colors.muted,
  },
  commentText: {
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
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  editActionWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  deadlineNotice: {
    fontSize: 11,
    color: colors.muted,
    flex: 1,
  },
  noticeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  lockNotice: {
    fontSize: 12,
    color: colors.muted,
    fontStyle: 'italic',
  },
});
