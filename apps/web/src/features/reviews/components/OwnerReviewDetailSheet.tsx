import {
  CalendarIcon,
  Edit3Icon,
  EyeIcon,
  EyeOffIcon,
  ImageIcon,
  MailIcon,
  MessageSquareIcon,
  PhoneIcon,
  SparklesIcon,
  StarIcon,
  Trash2Icon,
  UserIcon,
} from 'lucide-react';
import type { OwnerReview } from '@spa/shared-types';
import { ImageWithFallback } from '@/components/shared/ImageWithFallback/ImageWithFallback';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { initialOf } from '@/features/auth/components/AccountMenu';
import {
  formatReviewDateTime,
  ratingEmotionLabels,
  reviewStatusBadge,
} from '../utils/reviewHelpers';

interface Props {
  review: OwnerReview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReply: (review: OwnerReview) => void;
  onDeleteReply: (review: OwnerReview) => void;
  onToggleVisibility: (review: OwnerReview) => void;
  onImageClick: (url: string) => void;
}

export function OwnerReviewDetailSheet({
  review,
  open,
  onOpenChange,
  onReply,
  onDeleteReply,
  onToggleVisibility,
  onImageClick,
}: Props) {
  if (!review) return null;

  const isPackage = review.productType === 'package';
  const isVisible = review.status === 'visible';
  const statusInfo = reviewStatusBadge(review.status);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-lg overflow-y-auto">
        <SheetHeader className="p-6 border-b">
          <div className="flex items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-normal">
                {isPackage ? 'Gói dịch vụ' : 'Dịch vụ lẻ'}
              </Badge>
              <Badge
                variant="outline"
                className={`text-xs ${
                  isVisible
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : 'bg-muted text-muted-foreground border-border'
                }`}
              >
                {statusInfo.label}
              </Badge>
            </div>
          </div>
          <SheetTitle className="font-heading text-xl mt-1">
            Chi tiết đánh giá
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CalendarIcon className="size-3.5" aria-hidden="true" />
            <span>Gửi lúc {formatReviewDateTime(review.createdAtUtc)}</span>
            {review.updatedAtUtc && <span>· Đã sửa {formatReviewDateTime(review.updatedAtUtc)}</span>}
          </SheetDescription>
        </SheetHeader>

        <div className="p-6 space-y-6 flex-1">
          {/* Customer info card */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Khách hàng
            </p>
            <div className="flex items-center gap-3">
              <Avatar className="size-11 border">
                <AvatarFallback className="bg-primary/10 font-semibold text-sm text-primary">
                  {initialOf(review.customer.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-0.5 min-w-0">
                <p className="font-heading font-semibold text-base text-foreground truncate">
                  {review.customer.fullName}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {review.customer.phoneNumber && (
                    <span className="flex items-center gap-1">
                      <PhoneIcon className="size-3" aria-hidden="true" />
                      {review.customer.phoneNumber}
                    </span>
                  )}
                  {review.customer.email && (
                    <span className="flex items-center gap-1">
                      <MailIcon className="size-3" aria-hidden="true" />
                      {review.customer.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Product info card */}
          <div className="rounded-xl border bg-card p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Sản phẩm đánh giá
            </p>
            <div className="flex items-start gap-2.5">
              <SparklesIcon className="size-4.5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-heading font-semibold text-base text-foreground">
                  {review.productName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPackage ? 'Gói liệu trình nhiều buổi' : 'Dịch vụ lẻ đơn lẻ'}
                </p>
              </div>
            </div>
          </div>

          {/* Rating and review comment */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Nội dung đánh giá
            </p>

            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-1"
                aria-label={`${review.rating} trên 5 sao`}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon
                    key={star}
                    className={`size-5 ${
                      star <= review.rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground/25'
                    }`}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-amber-600">
                {ratingEmotionLabels[review.rating] || `${review.rating} sao`}
              </span>
            </div>

            <div className="rounded-lg bg-muted/30 p-3.5">
              <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                {review.comment || (
                  <span className="text-muted-foreground italic">
                    Khách hàng không để lại nhận xét bằng chữ.
                  </span>
                )}
              </p>
            </div>

            {/* Customer attached photo */}
            {review.imageUrl && (
              <div className="space-y-1.5 pt-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Ảnh chụp thực tế từ khách:
                </p>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => onImageClick(review.imageUrl!)}
                    className="group relative block overflow-hidden rounded-xl border border-border/80 transition-all hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary w-full max-w-xs"
                    aria-label="Xem ảnh phóng to"
                  >
                    <ImageWithFallback
                      src={review.imageUrl}
                      alt="Ảnh thực tế từ khách hàng"
                      fallbackIcon={ImageIcon}
                      className="h-44 w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1.5">
                      <ImageIcon className="size-4" />
                      Bấm để phóng to
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Owner Reply card */}
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-medium text-xs text-primary uppercase tracking-wider">
                <MessageSquareIcon className="size-4" aria-hidden="true" />
                <span>Phản hồi từ Spa</span>
              </div>
              {review.ownerReply && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReply(review)}
                    className="h-7 px-2 text-xs gap-1 text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    <Edit3Icon className="size-3" />
                    Sửa
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteReply(review)}
                    className="h-7 px-2 text-xs gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2Icon className="size-3" />
                    Xóa
                  </Button>
                </div>
              )}
            </div>

            {review.ownerReply ? (
              <div className="space-y-1">
                {review.repliedAtUtc && (
                  <p className="text-[11px] text-muted-foreground">
                    Phản hồi lúc {formatReviewDateTime(review.repliedAtUtc)}
                  </p>
                )}
                <p className="text-sm text-foreground/95 whitespace-pre-line leading-relaxed">
                  {review.ownerReply}
                </p>
              </div>
            ) : (
              <div className="space-y-2 py-1">
                <p className="text-xs text-muted-foreground italic">
                  Chưa có phản hồi chính thức từ Spa cho đánh giá này.
                </p>
                <Button
                  size="sm"
                  onClick={() => onReply(review)}
                  className="gap-1.5 rounded-lg text-xs"
                >
                  <MessageSquareIcon className="size-3.5" aria-hidden="true" />
                  Gửi phản hồi ngay
                </Button>
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="p-4 border-t bg-muted/10 flex flex-row items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleVisibility(review)}
            className="gap-1.5 text-xs rounded-xl"
          >
            {isVisible ? (
              <>
                <EyeOffIcon className="size-3.5" aria-hidden="true" />
                Ẩn khỏi trang công khai
              </>
            ) : (
              <>
                <EyeIcon className="size-3.5" aria-hidden="true" />
                Hiển thị lại công khai
              </>
            )}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs"
          >
            Đóng
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
