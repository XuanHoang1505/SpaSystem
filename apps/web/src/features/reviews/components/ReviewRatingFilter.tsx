import { StarIcon } from 'lucide-react';
import type { RatingSummary } from '@spa/shared-types';
import { Button } from '@/components/ui/button';

interface Props {
  selectedRating: number | undefined;
  onSelectRating: (rating: number | undefined) => void;
  summary: RatingSummary;
}

export function ReviewRatingFilter({
  selectedRating,
  onSelectRating,
  summary,
}: Props) {
  const { reviewCount, ratingCounts } = summary;

  const filters: { value: number | undefined; label: string; count: number }[] = [
    { value: undefined, label: 'Tất cả', count: reviewCount },
    { value: 5, label: '5 sao', count: ratingCounts['5'] ?? 0 },
    { value: 4, label: '4 sao', count: ratingCounts['4'] ?? 0 },
    { value: 3, label: '3 sao', count: ratingCounts['3'] ?? 0 },
    { value: 2, label: '2 sao', count: ratingCounts['2'] ?? 0 },
    { value: 1, label: '1 sao', count: ratingCounts['1'] ?? 0 },
  ];

  return (
    <div
      className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1"
      role="group"
      aria-label="Lọc đánh giá theo số sao"
    >
      {filters.map((filter) => {
        const isSelected = selectedRating === filter.value;

        return (
          <Button
            key={filter.label}
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelectRating(filter.value)}
            className={`h-8 rounded-full px-3.5 text-xs font-medium transition-all ${
              isSelected
                ? 'shadow-xs'
                : 'bg-background hover:bg-muted text-muted-foreground'
            }`}
          >
            {filter.value ? (
              <span className="flex items-center gap-1">
                <span>{filter.value}</span>
                <StarIcon className="size-3 fill-amber-400 text-amber-400" aria-hidden="true" />
              </span>
            ) : (
              <span>Tất cả</span>
            )}
            <span className="ml-1 opacity-80">({filter.count})</span>
          </Button>
        );
      })}
    </div>
  );
}
