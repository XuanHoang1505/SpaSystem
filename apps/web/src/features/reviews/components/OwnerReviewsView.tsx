import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { OwnerReview, OwnerReviewFilter, ReviewStatus } from '@spa/shared-types';
import { useTableSearchParams } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader/PageHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { OrdersBreadcrumb } from '@/features/orders';
import { useOwnerReviewMutations } from '../hooks/useOwnerReviewMutations';
import { useOwnerReviews } from '../hooks/useOwnerReviews';
import { OwnerReviewDetailSheet } from './OwnerReviewDetailSheet';
import { OwnerReviewFilterToolbar } from './OwnerReviewFilterToolbar';
import { OwnerReviewsDataTable } from './OwnerReviewsDataTable';
import { ReplyReviewDialog } from './ReplyReviewDialog';
import { ReviewImageDialog } from './ReviewImageDialog';

export function OwnerReviewsView() {
  const {
    pageNumber,
    pageSize,
    search,
    setSearch,
    setPage,
    setPageSize,
    getFilter,
    setFilter,
    resetFilters,
    hasFilters,
  } = useTableSearchParams({ defaultPageSize: 10 });

  const rating = getFilter('rating');
  const productType = (getFilter('productType') as 'service' | 'package' | '') || '';
  const status = (getFilter('status') as ReviewStatus | '') || '';
  const hasReply = getFilter('hasReply');

  const queryParams = useMemo<OwnerReviewFilter>(
    () => ({
      pageNumber,
      pageSize,
      search: search || undefined,
      rating: rating ? Number(rating) : undefined,
      productType: (productType as 'service' | 'package') || undefined,
      status: (status as ReviewStatus) || undefined,
      hasReply: hasReply === '' ? undefined : hasReply === 'true',
    }),
    [pageNumber, pageSize, search, rating, productType, status, hasReply],
  );

  const reviewsQuery = useOwnerReviews(queryParams);

  // Auto adjust page when out of bounds
  useEffect(() => {
    if (
      reviewsQuery.data &&
      reviewsQuery.data.totalPages > 0 &&
      pageNumber > reviewsQuery.data.totalPages
    ) {
      setPage(reviewsQuery.data.totalPages, { replace: true });
    }
  }, [reviewsQuery.data, pageNumber, setPage]);

  // Dialog & modal states
  const [selectedReviewForDetail, setSelectedReviewForDetail] = useState<OwnerReview | null>(null);
  const [replyReviewItem, setReplyReviewItem] = useState<OwnerReview | null>(null);
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [deleteReplyTarget, setDeleteReplyTarget] = useState<OwnerReview | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const { replyReview, removeReply, changeVisibility } = useOwnerReviewMutations();

  const handleOpenReply = (review: OwnerReview) => {
    setReplyReviewItem(review);
    setIsReplyOpen(true);
  };

  const handleSubmitReply = async (replyText: string) => {
    if (!replyReviewItem) return;
    try {
      const updated = await replyReview.mutateAsync({
        id: replyReviewItem.id,
        request: { reply: replyText },
      });
      toast.success(
        replyReviewItem.ownerReply
          ? 'Đã cập nhật phản hồi thành công'
          : 'Đã gửi phản hồi đánh giá',
      );
      // Synchronize detail sheet if open
      setSelectedReviewForDetail((current) =>
        current && current.id === updated.id ? updated : current,
      );
      setIsReplyOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể gửi phản hồi';
      toast.error(msg);
    }
  };

  const handleConfirmDeleteReply = async () => {
    if (!deleteReplyTarget) return;
    try {
      await removeReply.mutateAsync(deleteReplyTarget.id);
      toast.success('Đã xóa phản hồi');
      // Synchronize detail sheet if open
      setSelectedReviewForDetail((current) =>
        current && current.id === deleteReplyTarget.id
          ? { ...current, ownerReply: null, repliedAtUtc: null }
          : current,
      );
      setDeleteReplyTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa phản hồi';
      toast.error(msg);
    }
  };

  const handleToggleVisibility = async (review: OwnerReview) => {
    const newStatus = review.status === 'visible' ? 'hidden' : 'visible';
    try {
      await changeVisibility.mutateAsync({
        id: review.id,
        request: { status: newStatus },
      });
      toast.success(
        newStatus === 'visible'
          ? 'Đã hiển thị lại đánh giá công khai'
          : 'Đã ẩn đánh giá khỏi trang công khai',
      );
      // Synchronize detail sheet if open
      setSelectedReviewForDetail((current) =>
        current && current.id === review.id
          ? { ...current, status: newStatus }
          : current,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật trạng thái';
      toast.error(msg);
    }
  };

  const breadcrumbTrail = [
    { label: 'Trang chủ', to: '/' },
    { label: 'Quản trị spa', to: '/owner' },
    { label: 'Quản lý đánh giá' },
  ];

  return (
    <section className="space-y-6 rounded-2xl border bg-card p-5 shadow-xs sm:p-6 lg:p-8">
      <OrdersBreadcrumb trail={breadcrumbTrail} />

      <PageHeader
        title="Quản lý đánh giá"
        description="Theo dõi đánh giá từ khách hàng, phản hồi chính thức từ spa và điều chỉnh trạng thái hiển thị."
        className="border-b pb-4"
      />

      <div className="space-y-4 pt-1">
        <OwnerReviewFilterToolbar
          search={search}
          onSearchChange={setSearch}
          rating={rating}
          onRatingChange={(r) => setFilter('rating', r || null)}
          productType={productType}
          onProductTypeChange={(pt) => setFilter('productType', pt || null)}
          status={status}
          onStatusChange={(st) => setFilter('status', st || null)}
          hasReply={hasReply}
          onHasReplyChange={(hr) => setFilter('hasReply', hr || null)}
          hasFilters={hasFilters}
          onReset={resetFilters}
        />

        <OwnerReviewsDataTable
          data={reviewsQuery.data?.items}
          page={
            reviewsQuery.data
              ? {
                  pageNumber: reviewsQuery.data.pageNumber,
                  pageSize: reviewsQuery.data.pageSize,
                  totalCount: reviewsQuery.data.totalCount,
                  totalPages: reviewsQuery.data.totalPages,
                }
              : undefined
          }
          isLoading={reviewsQuery.isLoading}
          isFetching={reviewsQuery.isFetching}
          error={reviewsQuery.error instanceof Error ? reviewsQuery.error.message : null}
          onRetry={() => void reviewsQuery.refetch()}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          hasFilters={hasFilters}
          onResetFilters={resetFilters}
          onSelectReview={(review) => setSelectedReviewForDetail(review)}
          onReply={handleOpenReply}
          onDeleteReply={(review) => setDeleteReplyTarget(review)}
          onToggleVisibility={handleToggleVisibility}
          onImageClick={(url) => setPreviewImageUrl(url)}
        />
      </div>

      {/* Review Detail Sheet */}
      <OwnerReviewDetailSheet
        review={selectedReviewForDetail}
        open={Boolean(selectedReviewForDetail)}
        onOpenChange={(open) => !open && setSelectedReviewForDetail(null)}
        onReply={handleOpenReply}
        onDeleteReply={(review) => setDeleteReplyTarget(review)}
        onToggleVisibility={handleToggleVisibility}
        onImageClick={(url) => setPreviewImageUrl(url)}
      />

      {/* Reply dialog */}
      <ReplyReviewDialog
        open={isReplyOpen}
        onOpenChange={setIsReplyOpen}
        review={replyReviewItem}
        isSubmitting={replyReview.isPending}
        onSubmit={handleSubmitReply}
      />

      {/* Confirm Delete Reply Dialog */}
      <AlertDialog
        open={Boolean(deleteReplyTarget)}
        onOpenChange={(open) => !open && setDeleteReplyTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa phản hồi của Spa?</AlertDialogTitle>
            <AlertDialogDescription>
              Phản hồi chính thức sẽ bị gỡ bỏ khỏi đánh giá này. Bạn có thể phản hồi lại bất kỳ lúc nào.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void handleConfirmDeleteReply()}
              disabled={removeReply.isPending}
            >
              {removeReply.isPending ? 'Đang xóa...' : 'Xác nhận xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Review Image dialog */}
      <ReviewImageDialog
        imageUrl={previewImageUrl}
        onClose={() => setPreviewImageUrl(null)}
      />
    </section>
  );
}
