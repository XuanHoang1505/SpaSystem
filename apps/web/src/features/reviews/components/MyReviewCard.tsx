import { Edit3Icon, ImageIcon, MessageSquareIcon, SparklesIcon, StarIcon } from 'lucide-react';
import type { MyReview } from '@spa/shared-types';
import { ImageWithFallback } from '@/components/shared/ImageWithFallback/ImageWithFallback';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  formatReviewDate,
  formatReviewDateTime,
  reviewStatusBadge,
} from '../utils/reviewHelpers';

interface Props {
  review: MyReview;
  onEdit: (review: MyReview) => void;
  onImageClick: (url: string) => void;
}

export function MyReviewCard({ review, onEdit, onImageClick }: Props) {
  const isPackage = review.productType === 'package';
  const typeLabel = isPackage ? 'Gói dịch vụ' : 'Dịch vụ lẻ';
  const statusInfo = reviewStatusBadge(review.status);

  return (
    <Card className="rounded-2xl border bg-card transition-all hover:shadow-xs">
      <CardContent className="space-y-4 p-5 sm:p-6">
        {/* Top bar: Type badge & Status badge */}
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="text-xs font-normal">
            {typeLabel}
          </Badge>
          <Badge
            variant="outline"
            className={`text-xs ${
              review.status === 'visible'
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'bg-muted text-muted-foreground border-border'
            }`}
          >
            {statusInfo.label}
          </Badge>
        </div>

        {/* Product title & thumbnail */}
        <div className="flex items-center gap-3">
          {review.productImageUrl && (
            <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border bg-muted/20">
              <ImageWithFallback
                src={review.productImageUrl}
                alt={review.productName}
                fallbackIcon={SparklesIcon}
                className="size-full object-cover"
              />
            </div>
          )}
          <h3 className="font-heading font-semibold text-base sm:text-lg text-foreground">
            {review.productName}
          </h3>
        </div>

        {/* Rating stars & created date */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex items-center gap-1"
            aria-label={`${review.rating} trên 5 sao`}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <StarIcon
                key={star}
                className={`size-4 ${
                  star <= review.rating
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground/25'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {formatReviewDate(review.createdAtUtc)}
            {review.updatedAtUtc && ' (đã chỉnh sửa)'}
          </span>
        </div>

        {/* Comment text */}
        {review.comment && (
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
            {review.comment}
          </p>
        )}

        {/* Attached image */}
        {review.imageUrl && (
          <div>
            <button
              type="button"
              onClick={() => onImageClick(review.imageUrl!)}
              className="group relative block overflow-hidden rounded-xl border border-border/70 transition-all hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Xem ảnh đánh giá kích thước đầy đủ"
            >
              <ImageWithFallback
                src={review.imageUrl}
                alt="Ảnh đính kèm đánh giá"
                fallbackIcon={ImageIcon}
                className="h-28 w-28 sm:h-36 sm:w-36 object-cover transition-transform group-hover:scale-105"
              />
            </button>
          </div>
        )}

        {/* Spa Owner Reply Box */}
        {review.ownerReply && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-medium text-xs text-primary">
                <MessageSquareIcon className="size-3.5" aria-hidden="true" />
                <span>Phản hồi từ Spa</span>
              </div>
              {review.repliedAtUtc && (
                <span className="text-[11px] text-muted-foreground">
                  {formatReviewDateTime(review.repliedAtUtc)}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
              {review.ownerReply}
            </p>
          </div>
        )}

        {/* Bottom bar: Edit deadline & Edit button */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <div className="text-xs text-muted-foreground">
            {review.canEdit && review.editDeadlineAtUtc ? (
              <span>Có thể sửa đến {formatReviewDate(review.editDeadlineAtUtc)}</span>
            ) : (
              <span className="italic">Đã quá 30 ngày, không thể chỉnh sửa</span>
            )}
          </div>

          {review.canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(review)}
              className="gap-1.5 rounded-xl border-primary text-primary hover:bg-primary/10 hover:text-primary"
            >
              <Edit3Icon className="size-3.5" aria-hidden="true" />
              Chỉnh sửa
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
