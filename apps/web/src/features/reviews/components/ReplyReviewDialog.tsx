import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2Icon, MessageSquareIcon, StarIcon } from 'lucide-react';
import type { OwnerReview } from '@spa/shared-types';
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
import { replyReviewSchema, type ReplyReviewValues } from '../schemas';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: OwnerReview | null;
  isSubmitting?: boolean;
  onSubmit: (reply: string) => Promise<void>;
}

export function ReplyReviewDialog({
  open,
  onOpenChange,
  review,
  isSubmitting = false,
  onSubmit,
}: Props) {
  const isEditing = Boolean(review?.ownerReply);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ReplyReviewValues>({
    resolver: zodResolver(replyReviewSchema),
    defaultValues: {
      reply: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        reply: review?.ownerReply ?? '',
      });
    }
  }, [open, review, reset]);

  const currentReply = watch('reply') ?? '';

  const handleFormSubmit = async (values: ReplyReviewValues) => {
    await onSubmit(values.reply.trim());
  };

  if (!review) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => !isSubmitting && onOpenChange(val)}>
      <DialogContent className="max-w-lg sm:rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <MessageSquareIcon className="size-5" aria-hidden="true" />
            <DialogTitle className="font-heading text-lg">
              {isEditing ? 'Chỉnh sửa phản hồi' : 'Phản hồi đánh giá'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Phản hồi này sẽ được hiển thị công khai bên dưới đánh giá của khách hàng.
          </DialogDescription>
        </DialogHeader>

        {/* Customer review excerpt */}
        <div className="rounded-xl border bg-muted/30 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-foreground">{review.customer.fullName}</span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon
                  key={star}
                  className={`size-3.5 ${
                    star <= review.rating
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground/30'
                  }`}
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>
          <p className="text-muted-foreground italic line-clamp-3">
            "{review.comment || 'Không có bình luận chữ'}"
          </p>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="spa-reply-input" className="text-sm font-medium">
                Nội dung phản hồi từ Spa
              </Label>
              <span
                className={cn(
                  'text-xs',
                  currentReply.length > 900
                    ? 'font-medium text-destructive'
                    : 'text-muted-foreground',
                )}
              >
                {currentReply.length}/1000
              </span>
            </div>
            <Textarea
              id="spa-reply-input"
              {...register('reply')}
              placeholder="Cảm ơn quý khách đã tin tưởng và sử dụng dịch vụ tại Spa chúng tôi..."
              rows={5}
              maxLength={1000}
              disabled={isSubmitting}
              className="resize-none"
            />
            {errors.reply && (
              <p className="text-xs text-destructive">{errors.reply.message}</p>
            )}
          </div>

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
              {isEditing ? 'Lưu thay đổi' : 'Gửi phản hồi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
