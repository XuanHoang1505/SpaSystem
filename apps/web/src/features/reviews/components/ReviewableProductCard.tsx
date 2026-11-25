import { SparklesIcon, StarIcon } from 'lucide-react';
import type { ReviewableProduct } from '@spa/shared-types';
import { ImageWithFallback } from '@/components/shared/ImageWithFallback/ImageWithFallback';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { reviewIneligibilityLabels } from '../utils/reviewHelpers';

interface Props {
  product: ReviewableProduct;
  onReviewClick: (product: ReviewableProduct) => void;
}

export function ReviewableProductCard({ product, onReviewClick }: Props) {
  const isPackage = product.productType === 'package';
  const typeLabel = isPackage ? 'Gói dịch vụ' : 'Dịch vụ lẻ';

  return (
    <Card className="rounded-2xl border bg-card transition-all hover:shadow-xs">
      <CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border bg-muted/20 sm:size-20">
            <ImageWithFallback
              src={product.imageUrl}
              alt={product.name}
              fallbackIcon={SparklesIcon}
              className="size-full object-cover"
            />
          </div>

          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {typeLabel}
              </Badge>
              {!product.eligible && product.reason && (
                <Badge
                  variant="secondary"
                  className="h-auto max-w-full shrink text-left text-xs font-normal whitespace-normal text-muted-foreground"
                >
                  {reviewIneligibilityLabels[product.reason] ?? 'Chưa đủ điều kiện'}
                </Badge>
              )}
            </div>
            <h3 className="truncate font-heading text-base font-semibold text-foreground sm:text-lg">
              {product.name}
            </h3>
            {product.eligible && (
              <p className="text-xs text-muted-foreground">
                Đã hoàn thành buổi trải nghiệm · Bạn có thể chia sẻ đánh giá ngay
              </p>
            )}
          </div>
        </div>

        <div className="flex w-full shrink-0 items-center justify-end sm:w-auto">
          {product.eligible ? (
            <Button
              onClick={() => onReviewClick(product)}
              className="w-full gap-2 rounded-xl sm:w-auto"
            >
              <StarIcon className="size-4 fill-amber-300 text-amber-300" aria-hidden="true" />
              Viết đánh giá
            </Button>
          ) : (
            <Button variant="outline" disabled className="w-full text-muted-foreground sm:w-auto">
              Chưa đủ điều kiện
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
