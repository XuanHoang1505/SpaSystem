import { SlidersHorizontalIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  PriceRangeFilter,
  type PriceRange,
} from '@/components/shared/PriceRangeFilter/PriceRangeFilter';
import { cn } from '@/lib/utils';

/** Khoảng giá gói trong Popover cho màn hẹp (Esc đóng và trả focus về nút). */
export function PriceRangePopover({
  min,
  max,
  onApply,
  idPrefix,
  className,
}: {
  min: number | undefined;
  max: number | undefined;
  onApply: (range: PriceRange) => void;
  idPrefix: string;
  className?: string;
}) {
  const active = min !== undefined || max !== undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('bg-card', className)}>
          <SlidersHorizontalIcon aria-hidden="true" />
          Khoảng giá
          {active && <span className="size-2 rounded-full bg-primary" aria-label="đang lọc" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <PriceRangeFilter min={min} max={max} onApply={onApply} idPrefix={idPrefix} />
      </PopoverContent>
    </Popover>
  );
}
