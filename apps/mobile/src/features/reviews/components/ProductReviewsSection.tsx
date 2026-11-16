import { useState, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Star, MessageSquareDashed } from 'lucide-react-native';
import { AppText } from '@components/common/AppText';
import { AppButton } from '@components/common/AppButton';
import { AppLoader } from '@components/common/AppLoader';
import { ErrorState } from '@components/common/ErrorState';
import { EmptyState } from '@components/common/EmptyState';
import { colors } from '@/theme/colors';
import type { ReviewedProductType } from '@/lib/api/reviews';
import { useProductReviews } from '../hooks/useProductReviews';
import { RatingSummaryCard } from './RatingSummaryCard';
import { ReviewRatingFilter } from './ReviewRatingFilter';
import { PublicReviewCard } from './PublicReviewCard';
import { ReviewImageModal } from './ReviewImageModal';

interface Props {
  productId: string;
  productType: ReviewedProductType;
}

export function ProductReviewsSection({ productId, productType }: Props) {
  const [selectedRating, setSelectedRating] = useState<number | undefined>(undefined);
  const [pageNumber, setPageNumber] = useState(1);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useProductReviews({
    type: productType,
    id: productId,
    rating: selectedRating,
    pageNumber,
    pageSize: 5,
  });

  const handleSelectRating = useCallback((rating: number | undefined) => {
    setSelectedRating(rating);
    setPageNumber(1);
  }, []);

  const handleLoadMore = useCallback(() => {
    setPageNumber((prev) => prev + 1);
  }, []);

  const summary = data?.summary;
  const reviews = data?.page.items ?? [];
  const hasMore = Boolean(data?.page.hasNextPage);

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Star size={18} color="#F59E0B" fill="#F59E0B" />
          <AppText style={styles.sectionTitle}>Đánh giá từ khách hàng</AppText>
        </View>
        {summary && summary.reviewCount > 0 ? (
          <AppText style={styles.headerBadge}>
            {summary.averageRating ? `${summary.averageRating.toFixed(1)} ★` : ''} ({summary.reviewCount})
          </AppText>
        ) : null}
      </View>

      {isLoading && pageNumber === 1 ? (
        <View style={styles.centerContainer}>
          <AppLoader />
          <AppText style={styles.loadingText}>Đang tải đánh giá...</AppText>
        </View>
      ) : isError ? (
        <ErrorState
          message="Không thể tải danh sách đánh giá. Vui lòng thử lại."
          onRetry={() => refetch()}
        />
      ) : summary && summary.reviewCount === 0 ? (
        <EmptyState
          icon={MessageSquareDashed}
          title="Chưa có đánh giá nào"
          description="Hãy là người đầu tiên trải nghiệm dịch vụ và để lại cảm nhận của bạn nhé!"
        />
      ) : (
        <>
          {summary ? <RatingSummaryCard summary={summary} /> : null}

          {summary ? (
            <ReviewRatingFilter
              selectedRating={selectedRating}
              onSelectRating={handleSelectRating}
              summary={summary}
            />
          ) : null}

          {reviews.length === 0 ? (
            <View style={styles.filterEmptyBox}>
              <AppText style={styles.filterEmptyText}>
                Không có đánh giá nào {selectedRating ? `${selectedRating} sao` : ''}.
              </AppText>
            </View>
          ) : (
            reviews.map((item) => (
              <PublicReviewCard
                key={item.id}
                review={item}
                onPressImage={(url) => setModalImageUrl(url)}
              />
            ))
          )}

          {hasMore ? (
            <View style={styles.loadMoreWrap}>
              <AppButton
                title="Xem thêm đánh giá"
                variant="outline"
                onPress={handleLoadMore}
              />
            </View>
          ) : null}
        </>
      )}

      {/* Fullscreen Image Preview Modal */}
      <ReviewImageModal
        imageUrl={modalImageUrl}
        onClose={() => setModalImageUrl(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  headerBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryPressed,
  },
  centerContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: colors.muted,
  },
  filterEmptyBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  filterEmptyText: {
    fontSize: 13,
    color: colors.muted,
  },
  loadMoreWrap: {
    marginTop: 8,
    alignItems: 'center',
  },
});
