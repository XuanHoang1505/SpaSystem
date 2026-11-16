import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, MessageSquareHeartIcon, StarIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useProductReviews } from '../hooks/useProductReviews';
import { RatingSummaryCard } from './RatingSummaryCard';
import { ReviewRatingFilter } from './ReviewRatingFilter';
import { PublicReviewCard } from './PublicReviewCard';
import { ReviewImageDialog } from './ReviewImageDialog';
import type { ReviewedProductType } from '@/lib/api/reviews';

interface Props {
  productId: string;
  productType: ReviewedProductType;
}

export function ProductReviewsSection({ productId, productType }: Props) {
  const [selectedRating, setSelectedRating] = useState<number | undefined>(undefined);
  const [pageNumber, setPageNumber] = useState(1);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useProductReviews({
    type: productType,
    id: productId,
    params: {
      rating: selectedRating,
      pageNumber,
      pageSize: 5,
    },
  });

  const handleSelectRating = (rating: number | undefined) => {
    setSelectedRating(rating);
    setPageNumber(1);
  };

  const summary = data?.summary;
  const reviews = data?.page.items ?? [];
  const totalPages = data?.page.totalPages ?? 1;
  const hasReviews = (summary?.reviewCount ?? 0) > 0;

  return (
    <section className="space-y-6 pt-6" aria-labelledby="reviews-section-heading">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2
            id="reviews-section-heading"
            className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl"
          >
            Đánh giá từ khách hàng
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Trải nghiệm thực tế từ những khách hàng đã sử dụng {productType === 'package' ? 'gói liệu trình' : 'dịch vụ'} này
          </p>
        </div>

        {summary && summary.reviewCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
            <StarIcon className="size-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
            <span>{summary.averageRating?.toFixed(1) ?? '5.0'} / 5.0</span>
            <span className="font-normal text-muted-foreground">({summary.reviewCount} đánh giá)</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-36 w-full rounded-2xl" />
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full" />
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      ) : isError ? (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertTitle>Không tải được đánh giá</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{error instanceof Error ? error.message : 'Đã có lỗi xảy ra khi lấy danh sách đánh giá.'}</span>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      ) : !hasReviews ? (
        <Card className="rounded-2xl border border-dashed bg-card/40 text-center">
          <CardContent className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
              <MessageSquareHeartIcon className="size-6" aria-hidden="true" />
            </div>
            <h3 className="font-heading text-base font-semibold text-foreground">
              Chưa có đánh giá nào
            </h3>
            <p className="mt-1 max-w-md text-xs text-muted-foreground leading-relaxed">
              Hãy là người đầu tiên trải nghiệm {productType === 'package' ? 'gói liệu trình' : 'dịch vụ'} này và chia sẻ cảm nhận của bạn!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary Score & 5-Star Distribution */}
          {summary && <RatingSummaryCard summary={summary} />}

          {/* Filter Chips Bar */}
          {summary && (
            <ReviewRatingFilter
              summary={summary}
              selectedRating={selectedRating}
              onSelectRating={handleSelectRating}
            />
          )}

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <Card className="rounded-2xl border border-dashed bg-card/30 p-8 text-center text-xs text-muted-foreground">
              Không tìm thấy đánh giá nào {selectedRating ? `cho mức ${selectedRating} sao` : ''}.
            </Card>
          ) : (
            <div className="space-y-4">
              {reviews.map((rev) => (
                <PublicReviewCard
                  key={rev.id}
                  review={rev}
                  onImageClick={(url) => setPreviewImageUrl(url)}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4 text-xs">
              <span className="text-muted-foreground">
                Trang {pageNumber} / {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageNumber((p) => Math.max(p - 1, 1))}
                  disabled={pageNumber <= 1}
                  className="h-8 gap-1 rounded-lg px-3"
                >
                  <ChevronLeftIcon className="size-3.5" aria-hidden="true" />
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageNumber((p) => Math.min(p + 1, totalPages))}
                  disabled={pageNumber >= totalPages}
                  className="h-8 gap-1 rounded-lg px-3"
                >
                  Sau
                  <ChevronRightIcon className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full-size Image Dialog */}
      <ReviewImageDialog
        imageUrl={previewImageUrl}
        onClose={() => setPreviewImageUrl(null)}
      />
    </section>
  );
}
