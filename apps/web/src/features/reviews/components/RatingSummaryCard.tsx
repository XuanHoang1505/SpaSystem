import { StarIcon } from 'lucide-react';
import type { RatingSummary } from '@spa/shared-types';
import { Card, CardContent } from '@/components/ui/card';
import { formatRatingAverage } from '../utils/reviewHelpers';

interface Props {
  summary: RatingSummary;
}

export function RatingSummaryCard({ summary }: Props) {
  const { averageRating, reviewCount, ratingCounts } = summary;
  const avgStr = formatRatingAverage(averageRating) ?? '0.0';
  const numericAvg = averageRating ?? 0;

  return (
    <Card className="rounded-2xl border bg-card/60 shadow-xs">
      <CardContent className="p-6">
        <div className="grid gap-6 sm:grid-cols-[140px_1fr] sm:items-center">
          {/* Big Score & Stars */}
          <div className="flex flex-col items-center justify-center text-center sm:border-r sm:pr-6">
            <span className="font-heading text-5xl font-extrabold text-foreground">
              {avgStr}
            </span>
            <div
              className="mt-2 flex items-center gap-1"
              aria-label={`Điểm trung bình ${avgStr} trên 5 sao`}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon
                  key={star}
                  className={`size-4.5 ${
                    star <= Math.round(numericAvg)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground/30'
                  }`}
                  aria-hidden="true"
                />
              ))}
            </div>
            <span className="mt-1.5 text-xs text-muted-foreground">
              {reviewCount} đánh giá
            </span>
          </div>

          {/* 5-Star Distribution Bars */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingCounts[String(star)] ?? 0;
              const percentage = reviewCount > 0 ? (count / reviewCount) * 100 : 0;

              return (
                <div key={star} className="flex items-center gap-3 text-xs">
                  <div className="flex w-12 items-center gap-1 text-muted-foreground">
                    <span className="font-medium text-foreground">{star}</span>
                    <StarIcon className="size-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                  </div>

                  <div
                    role="progressbar"
                    aria-label={`${star} sao: ${count} đánh giá`}
                    aria-valuenow={percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <span className="w-8 text-right font-medium text-muted-foreground">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
