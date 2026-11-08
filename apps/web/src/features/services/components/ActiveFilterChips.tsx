import { XIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/formatting/formatters';
import { presetOf } from '../pricePresets';

export interface ActiveFilters {
  search?: string;
  /** Tên danh mục đang lọc (tra từ danh sách danh mục theo `categoryId`). */
  categoryName?: string;
  minPrice?: number;
  maxPrice?: number;
}

function priceLabel(min: number | undefined, max: number | undefined) {
  const preset = presetOf(min, max);
  if (preset) return preset.label;
  if (min !== undefined && max !== undefined)
    return `${formatCurrency(min)} – ${formatCurrency(max)}`;
  if (min !== undefined) return `Từ ${formatCurrency(min)}`;
  return `Đến ${formatCurrency(max ?? 0)}`;
}

/** Bộ lọc đang bật trên thanh công cụ; bấm × để bỏ từng bộ lọc. */
export function ActiveFilterChips({
  filters,
  onRemove,
}: {
  filters: ActiveFilters;
  onRemove: (key: 'search' | 'category' | 'price') => void;
}) {
  const chips: { key: 'search' | 'category' | 'price'; label: string }[] = [];
  if (filters.search) chips.push({ key: 'search', label: `“${filters.search}”` });
  if (filters.categoryName) chips.push({ key: 'category', label: filters.categoryName });
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined)
    chips.push({ key: 'price', label: priceLabel(filters.minPrice, filters.maxPrice) });
  if (chips.length === 0) return null;
  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label="Bộ lọc đang chọn">
      {chips.map((chip) => (
        <li
          key={chip.key}
          className="inline-flex items-center gap-1 rounded-md border bg-muted/60 py-0.5 pr-1 pl-2 text-xs"
        >
          {chip.label}
          <button
            type="button"
            aria-label={`Bỏ lọc ${chip.label}`}
            onClick={() => onRemove(chip.key)}
            className="grid size-5 place-items-center rounded-sm text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <XIcon className="size-3" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}
