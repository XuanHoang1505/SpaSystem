import { StarIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useServiceSearch } from '@/features/services';
import { formatLocalDate } from '@/lib/formatting/formatters';
import { vietnamDateOf } from '@/lib/formatting/vietnamTime';
import { cn } from '@/lib/utils';
import { demoReviews, type HomeReview } from '../homeDemoContent';
import { useHomeReviews } from '../hooks/useHomeData';
import { HomeContainer } from './HomeContainer';

const cardCount = 3;

function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn('flex gap-0.5', className)} role="img" aria-label={`${rating} trên 5 sao`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon
          key={i}
          aria-hidden="true"
          className={cn('size-4', i < rating ? 'fill-chart-3 text-chart-3' : 'text-border')}
        />
      ))}
    </span>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

const formatRating = (value: number) => value.toFixed(1).replace('.', ',');

/**
 * Customer reviews on a full-width white band: the real rating summary and a heading on top, three review cards below.
 * Real reviews (from the most reviewed services) come first; while there are fewer than three, labelled DEMO ones
 * fill the remaining cards. The summary numbers are always the real ones.
 */
export function ReviewsSection() {
  const services = useServiceSearch({ pageNumber: 1, pageSize: 50, status: 'on_sale' });
  const { reviews, averageRating, reviewCount, isPending } = useHomeReviews(
    services.data?.items ?? [],
  );
  const loading = services.isPending || isPending;
  const cards: { review: HomeReview; demo: boolean }[] = [
    ...reviews.slice(0, cardCount).map((review) => ({ review, demo: false })),
    ...demoReviews
      .slice(0, Math.max(0, cardCount - reviews.length))
      .map((review) => ({ review, demo: true })),
  ];

  return (
    <section aria-labelledby="home-reviews" className="border-y bg-card py-16 md:py-24">
      <HomeContainer className="space-y-10">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center space-y-3.5">
          {averageRating !== null && (
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary shadow-xs">
              <Stars rating={Math.round(averageRating)} />
              <span>{formatRating(averageRating)} / 5</span>
              <span className="text-muted-foreground font-normal">({reviewCount} đánh giá công khai)</span>
            </div>
          )}
          <h2
            id="home-reviews"
            className="pb-1 font-heading text-3xl leading-[1.2] tracking-tight sm:text-4xl md:text-[2.65rem] bg-gradient-to-r from-[#1c472d] via-primary to-[#b4566f] bg-clip-text text-transparent"
          >
            Cảm nhận từ khách hàng
          </h2>
          <p className="mx-auto max-w-xl text-base text-muted-foreground leading-relaxed">
            Mỗi đánh giá được gửi sau buổi chăm sóc đã hoàn thành và hiển thị công khai, không qua chỉnh sửa.
          </p>
          <div className="mx-auto h-1 w-12 rounded-full bg-gradient-to-r from-primary to-[#b4566f] opacity-80" />
        </div>

        {loading ? (
          <div className="grid gap-5 md:grid-cols-3" aria-label="Đang tải đánh giá">
            {Array.from({ length: cardCount }, (_, i) => (
              <Skeleton key={i} className="h-64 rounded-sm" />
            ))}
          </div>
        ) : (
          <ul className="grid gap-5 md:grid-cols-3">
            {cards.map(({ review, demo }) => (
              <li key={review.id}>
                <figure className="flex h-full flex-col gap-5 rounded-sm border bg-background p-6">
                  <div className="flex h-6 items-center justify-between gap-2">
                    <Stars rating={review.rating} />
                    {demo && (
                      <span className="rounded-sm bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Minh họa
                      </span>
                    )}
                  </div>
                  <blockquote className="line-clamp-5 flex-1 text-[15px] leading-relaxed text-foreground/90 italic">
                    “{review.comment}”
                  </blockquote>
                  <figcaption className="flex items-center gap-3 border-t pt-5">
                    <span
                      aria-hidden="true"
                      className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground"
                    >
                      {initials(review.reviewerName)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-primary">
                        {review.reviewerName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {review.serviceName}, {formatLocalDate(vietnamDateOf(review.createdAtUtc))}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        )}
      </HomeContainer>
    </section>
  );
}
