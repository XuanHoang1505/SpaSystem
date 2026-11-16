import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2Icon, StarIcon } from 'lucide-react';
import type { MyReview } from '@spa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { reviewFormSchema, type ReviewFormValues } from '../schemas';
import { ratingEmotionLabels } from '../utils/reviewHelpers';
import { ReviewImagePicker } from './ReviewImagePicker';

export interface ReviewDialogProduct {
  id: string;
  name: string;
  type: 'service' | 'package';
  thumbnail?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ReviewDialogProduct | null;
  existingReview?: MyReview | null;
  isSubmitting?: boolean;
  onSubmit: (values: {
    rating: number;
    comment?: string;
    imageFile: File | null;
    removeExistingImage: boolean;
  }) => Promise<void>;
}

export function ReviewFormDialog({
  open,
  onOpenChange,
  product,
  existingReview,
  isSubmitting = false,
  onSubmit,
}: Props) {
  const isEditing = Boolean(existingReview);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      rating: 5,
      comment: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (existingReview) {
        reset({
          rating: existingReview.rating,
          comment: existingReview.comment ?? '',
        });
      } else {
        reset({
          rating: 5,
          comment: '',
        });
      }
      setImageFile(null);
      setRemoveExistingImage(false);
      setHoverRating(null);
    }
  }, [open, existingReview, reset]);

  const ratingValue = watch('rating') ?? 5;
  const activeRating = hoverRating ?? ratingValue;
  const currentComment = watch('comment') ?? '';

  const handleFormSubmit = async (values: ReviewFormValues) => {
    await onSubmit({
      rating: values.rating,
      comment: values.comment?.trim() ? values.comment.trim() : undefined,
      imageFile,
      removeExistingImage,
    });
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => !isSubmitting && onOpenChange(val)}>
      <DialogContent className="max-w-lg sm:rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {product.type === 'package' ? 'Gói dịch vụ' : 'Dịch vụ lẻ'}
            </Badge>
          </div>
          <DialogTitle className="font-heading text-xl">
            {isEditing ? 'Chỉnh sửa đánh giá' : 'Đánh giá dịch vụ'}
          </DialogTitle>
          <DialogDescription className="text-sm font-medium text-foreground">
            {product.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5 pt-1">
          {/* Star Rating Section */}
          <div className="space-y-2 text-center">
            <div className="flex flex-col items-center justify-center gap-2">
              <div
                className="flex items-center gap-1.5"
                role="radiogroup"
                aria-label="Chọn số sao đánh giá từ 1 đến 5 sao"
                onMouseLeave={() => setHoverRating(null)}
              >
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= activeRating;
                  return (
                    <button
                      key={star}
                      type="button"
                      role="radio"
                      aria-checked={ratingValue === star}
                      aria-label={`${star} sao - ${ratingEmotionLabels[star]}`}
                      disabled={isSubmitting}
                      onMouseEnter={() => setHoverRating(star)}
                      onClick={() => setValue('rating', star, { shouldValidate: true })}
                      className="group p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg transition-transform hover:scale-115 active:scale-95"
                    >
                      <StarIcon
                        className={cn(
                          'size-8 transition-colors',
                          isFilled
                            ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                            : 'text-muted-foreground/30 hover:text-amber-200',
                        )}
                      />
                    </button>
                  );
                })}
              </div>

              <p className="min-h-5 text-sm font-medium text-amber-600 transition-colors">
                {ratingEmotionLabels[activeRating] || ''}
              </p>
            </div>
            {errors.rating && (
              <p className="text-xs text-destructive">{errors.rating.message}</p>
            )}
          </div>

          {/* Comment Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="review-comment" className="text-sm font-medium">
                Nhận xét của bạn <span className="text-xs text-muted-foreground font-normal">(không bắt buộc)</span>
              </Label>
              <span
                className={cn(
                  'text-xs',
                  currentComment.length > 900
                    ? 'font-medium text-destructive'
                    : 'text-muted-foreground',
                )}
              >
                {currentComment.length}/1000
              </span>
            </div>
            <Textarea
              id="review-comment"
              {...register('comment')}
              placeholder="Chia sẻ cảm nhận về kỹ thuật viên, không gian, hiệu quả dịch vụ..."
              rows={4}
              maxLength={1000}
              disabled={isSubmitting}
              className="resize-none"
            />
            {errors.comment && (
              <p className="text-xs text-destructive">{errors.comment.message}</p>
            )}
          </div>

          {/* Image Picker */}
          <ReviewImagePicker
            value={imageFile}
            currentUrl={removeExistingImage ? null : existingReview?.imageUrl}
            disabled={isSubmitting}
            onChange={(file) => {
              setImageFile(file);
              if (file) setRemoveExistingImage(false);
            }}
            onRemoveCurrent={() => {
              setRemoveExistingImage(true);
              setImageFile(null);
            }}
          />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2Icon className="mr-2 size-4 animate-spin" />}
              {isEditing ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
