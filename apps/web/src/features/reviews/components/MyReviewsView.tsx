import { useState } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  MessageSquareCheckIcon,
  SparklesIcon,
  StarIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import type { MyReview, ReviewableProduct } from '@spa/shared-types';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMyReviewMutations } from '../hooks/useMyReviewMutations';
import { useMyReviews } from '../hooks/useMyReviews';
import { useReviewableProducts } from '../hooks/useReviewableProducts';
import { MyReviewCard } from './MyReviewCard';
import { ReviewableProductCard } from './ReviewableProductCard';
import { ReviewFormDialog, type ReviewDialogProduct } from './ReviewFormDialog';
import { ReviewImageDialog } from './ReviewImageDialog';

export function MyReviewsView() {
  const [activeTab, setActiveTab] = useState<'pending' | 'reviewed'>('pending');
  const [reviewedPage, setReviewedPage] = useState(1);

  // Dialog & preview states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogProduct, setDialogProduct] = useState<ReviewDialogProduct | null>(null);
  const [editingReview, setEditingReview] = useState<MyReview | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Data queries
  const {
    data: pendingProducts = [],
    isLoading: isLoadingPending,
    isError: isPendingError,
    refetch: refetchPending,
  } = useReviewableProducts();

  const {
    data: myReviewsPage,
    isLoading: isLoadingReviews,
    isError: isReviewsError,
    refetch: refetchReviews,
  } = useMyReviews({ pageNumber: reviewedPage, pageSize: 10 });

  const { createReview, updateReview } = useMyReviewMutations();
  const isSubmitting = createReview.isPending || updateReview.isPending;

  // Handlers
  const handleStartReview = (product: ReviewableProduct) => {
    setEditingReview(null);
    setDialogProduct({
      id: product.productId,
      name: product.name,
      type: product.productType,
      thumbnail: product.imageUrl,
    });
    setIsDialogOpen(true);
  };

  const handleEditReview = (review: MyReview) => {
    setEditingReview(review);
    setDialogProduct({
      id: review.productId,
      name: review.productName,
      type: review.productType,
      thumbnail: review.productImageUrl,
    });
    setIsDialogOpen(true);
  };

  const handleSubmitReview = async (values: {
    rating: number;
    comment?: string;
    imageFile: File | null;
    removeExistingImage: boolean;
  }) => {
    if (!dialogProduct) return;

    try {
      if (editingReview) {
        await updateReview.mutateAsync({
          id: editingReview.id,
          request: {
            rating: values.rating,
            comment: values.comment,
          },
          imageFile: values.imageFile,
          removeImage: values.removeExistingImage,
        });
        toast.success('Đã cập nhật đánh giá thành công');
      } else {
        const isPackage = dialogProduct.type === 'package';
        await createReview.mutateAsync({
          request: {
            spaServiceId: isPackage ? undefined : dialogProduct.id,
            servicePackageId: isPackage ? dialogProduct.id : undefined,
            rating: values.rating,
            comment: values.comment,
          },
          imageFile: values.imageFile,
        });
        toast.success('Cảm ơn bạn đã gửi đánh giá!');
        setActiveTab('reviewed');
      }
      setIsDialogOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu đánh giá';
      toast.error(msg);
    }
  };

  const pendingEligibleCount = pendingProducts.filter((p) => p.eligible).length;
  const totalReviewed = myReviewsPage?.totalCount ?? 0;
  const totalPages = myReviewsPage?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Đánh giá của tôi
        </h1>
        <p className="text-sm text-muted-foreground">
          Theo dõi, chia sẻ cảm nhận và đánh giá các dịch vụ spa bạn đã trải nghiệm
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'pending' | 'reviewed')}
        className="w-full space-y-6"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <ClockIcon className="size-4" aria-hidden="true" />
            <span>Chờ đánh giá</span>
            {pendingEligibleCount > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                {pendingEligibleCount}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger value="reviewed" className="flex items-center gap-2">
            <MessageSquareCheckIcon className="size-4" aria-hidden="true" />
            <span>Đã đánh giá</span>
            {totalReviewed > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                {totalReviewed}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Pending reviews */}
        <TabsContent value="pending" className="space-y-4 focus-visible:outline-none">
          {isLoadingPending ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="rounded-2xl border p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-16 rounded-xl" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-5 w-48" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : isPendingError ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center space-y-3">
              <p className="text-sm text-destructive">Không thể tải danh sách dịch vụ chờ đánh giá.</p>
              <Button variant="outline" size="sm" onClick={() => void refetchPending()}>
                Thử lại
              </Button>
            </div>
          ) : pendingProducts.length === 0 ? (
            <EmptyState
              icon={SparklesIcon}
              title="Không có dịch vụ chờ đánh giá"
              description="Sau khi hoàn thành buổi dịch vụ hoặc liệu trình, bạn có thể quay lại đây để chia sẻ trải nghiệm."
            />
          ) : (
            <div className="space-y-3">
              {pendingProducts.map((product) => (
                <ReviewableProductCard
                  key={`${product.productType}-${product.productId}`}
                  product={product}
                  onReviewClick={handleStartReview}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Submitted reviews */}
        <TabsContent value="reviewed" className="space-y-4 focus-visible:outline-none">
          {isLoadingReviews ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="rounded-2xl border p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : isReviewsError ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center space-y-3">
              <p className="text-sm text-destructive">Không thể tải danh sách đánh giá của bạn.</p>
              <Button variant="outline" size="sm" onClick={() => void refetchReviews()}>
                Thử lại
              </Button>
            </div>
          ) : !myReviewsPage?.items || myReviewsPage.items.length === 0 ? (
            <EmptyState
              icon={StarIcon}
              title="Bạn chưa có đánh giá nào"
              description="Hãy chia sẻ cảm nhận về các dịch vụ đã trải nghiệm ở tab 'Chờ đánh giá'."
            />
          ) : (
            <>
              <div className="space-y-4">
                {myReviewsPage.items.map((review) => (
                  <MyReviewCard
                    key={review.id}
                    review={review}
                    onEdit={handleEditReview}
                    onImageClick={(url) => setPreviewImageUrl(url)}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={reviewedPage <= 1}
                    onClick={() => setReviewedPage((p) => Math.max(1, p - 1))}
                    aria-label="Trang trước"
                  >
                    <ChevronLeftIcon className="size-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Trang {reviewedPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={reviewedPage >= totalPages}
                    onClick={() => setReviewedPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="Trang kế tiếp"
                  >
                    <ChevronRightIcon className="size-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog (Create or Edit) */}
      <ReviewFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        product={dialogProduct}
        existingReview={editingReview}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmitReview}
      />

      {/* Full image preview dialog */}
      <ReviewImageDialog
        imageUrl={previewImageUrl}
        onClose={() => setPreviewImageUrl(null)}
      />
    </div>
  );
}
