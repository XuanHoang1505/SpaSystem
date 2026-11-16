import { SparklesIcon, StarIcon } from 'lucide-react';
import type { PublicReview } from '@spa/shared-types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { initialOf } from '@/features/auth/components/AccountMenu';
import { formatReviewDate } from '../utils/reviewHelpers';

interface Props {
  review: PublicReview;
  onImageClick: (url: string) => void;
}

export function PublicReviewCard({ review, onImageClick }: Props) {
  const {
    rating,
    comment,
    imageUrl,
    reviewerName,
    createdAtUtc,
    ownerReply,
    repliedAtUtc,
  } = review;

  return (
    <Card className="rounded-2xl border bg-card/70 transition-all shadow-xs">
      <CardContent className="p-5 sm:p-6 space-y-4">
        {/* Header: User avatar, name, date, stars */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-10 border border-border/80">
              <AvatarFallback className="bg-primary/10 font-heading text-sm font-bold text-primary">
                {initialOf(reviewerName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm text-foreground">{reviewerName}</p>
              <p className="text-xs text-muted-foreground">{formatReviewDate(createdAtUtc)}</p>
            </div>
          </div>

          <div
            className="flex items-center gap-1"
            aria-label={`${rating} trên 5 sao`}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <StarIcon
                key={star}
                className={`size-4 ${
                  star <= rating
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground/25'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>

        {/* Comment Content */}
        {comment && (
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
            {comment}
          </p>
        )}

        {/* Attached Customer Image */}
        {imageUrl && (
          <div>
            <button
              type="button"
              onClick={() => onImageClick(imageUrl)}
              className="group relative block overflow-hidden rounded-xl border border-border/70 transition-all hover:opacity-95 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Xem ảnh đánh giá phóng to"
            >
              <img
                src={imageUrl}
                alt="Ảnh chụp trải nghiệm"
                className="size-20 sm:size-24 object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            </button>
          </div>
        )}

        {/* Spa Owner Reply */}
        {ownerReply && (
          <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-medium text-primary">
              <SparklesIcon className="size-3.5" aria-hidden="true" />
              <span>Phản hồi từ Như Nguyệt Spa</span>
              {repliedAtUtc && (
                <span className="text-[11px] font-normal text-muted-foreground">
                  • {formatReviewDate(repliedAtUtc)}
                </span>
              )}
            </div>
            <p className="text-foreground/80 leading-relaxed whitespace-pre-line">
              {ownerReply}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
