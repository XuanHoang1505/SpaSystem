import { useId, useState, type ReactNode } from 'react';
import { FilterIcon, RotateCwIcon, SlidersHorizontalIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { placeholderDurations, placeholderSkinConcerns } from '../catalogPlaceholders';
import { useServiceCategories } from '../hooks/useServiceCategories';
import { presetOf, servicePricePresets } from '../pricePresets';

export interface ServiceFilterValues {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
}

function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <div role="group" aria-labelledby={headingId} className="space-y-2.5 border-t pt-4">
      <h3
        id={headingId}
        className="flex items-center gap-2 font-sans text-xs font-semibold tracking-wider uppercase"
      >
        {title}
        {note && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tracking-normal text-muted-foreground normal-case">
            {note}
          </span>
        )}
      </h3>
      {children}
    </div>
  );
}

/**
 * Bộ lọc SCR-W02 theo mẫu Stitch. Loại dịch vụ và mức giá là bộ lọc thật (chọn xong bấm
 * "Áp dụng bộ lọc"); thời lượng và tình trạng da là giao diện tạm, chưa gửi lên API.
 */
export function ServiceFilterPanel({
  value,
  onApply,
  onReset,
  className,
}: {
  value: ServiceFilterValues;
  onApply: (value: ServiceFilterValues) => void;
  onReset: () => void;
  className?: string;
}) {
  const id = useId();
  const categories = useServiceCategories();
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  const [durations, setDurations] = useState<number[]>([]);
  const [concerns, setConcerns] = useState<string[]>([]);

  // Bộ lọc trên URL đổi từ bên ngoài (Xóa bộ lọc, chip, back/forward): đồng bộ lại bản nháp.
  if (
    synced.categoryId !== value.categoryId ||
    synced.minPrice !== value.minPrice ||
    synced.maxPrice !== value.maxPrice
  ) {
    setSynced(value);
    setDraft(value);
  }

  const preset = presetOf(draft.minPrice, draft.maxPrice);
  const toggle = <T,>(list: T[], item: T) =>
    list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-sans text-sm font-semibold tracking-wider uppercase">
          <SlidersHorizontalIcon className="size-4 text-primary" aria-hidden="true" />
          Bộ lọc tìm kiếm
        </h2>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs text-muted-foreground"
          onClick={() => {
            setDurations([]);
            setConcerns([]);
            onReset();
          }}
        >
          Đặt lại
        </Button>
      </div>

      <Group title="Danh mục dịch vụ">
        {categories.isError ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            Không tải được loại dịch vụ
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void categories.refetch()}
              loading={categories.isFetching}
            >
              {!categories.isFetching && <RotateCwIcon aria-hidden="true" />}
              Thử lại
            </Button>
          </p>
        ) : categories.isPending ? (
          Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-5 w-40" />)
        ) : (
          categories.data.map((category) => {
            const checkboxId = `${id}-category-${category.id}`;
            return (
              <div key={category.id} className="flex items-center gap-2.5">
                <Checkbox
                  id={checkboxId}
                  checked={draft.categoryId === category.id}
                  onCheckedChange={(checked) =>
                    setDraft({ ...draft, categoryId: checked === true ? category.id : undefined })
                  }
                />
                <Label htmlFor={checkboxId} className="flex-1 font-normal">
                  {category.name}
                </Label>
                <span
                  className="text-xs text-muted-foreground"
                  aria-label={`${category.serviceCount} dịch vụ`}
                >
                  {category.serviceCount}
                </span>
              </div>
            );
          })
        )}
      </Group>

      <Group title="Mức chi phí">
        <div role="radiogroup" aria-label="Mức chi phí" className="space-y-2.5">
          {[{ id: 'all', label: 'Tất cả mức giá', range: {} }, ...servicePricePresets].map(
            (option) => {
              const radioId = `${id}-price-${option.id}`;
              const checked =
                option.id === 'all'
                  ? draft.minPrice === undefined && draft.maxPrice === undefined
                  : preset?.id === option.id;
              return (
                <div key={option.id} className="flex items-center gap-2.5">
                  <input
                    id={radioId}
                    type="radio"
                    name={`${id}-price`}
                    checked={checked}
                    onChange={() =>
                      setDraft({
                        ...draft,
                        minPrice: option.range.min,
                        maxPrice: option.range.max,
                      })
                    }
                    className="size-4 accent-primary"
                  />
                  <Label htmlFor={radioId} className="font-normal">
                    {option.label}
                  </Label>
                </div>
              );
            },
          )}
        </div>
      </Group>

      <Group title="Thời lượng" note="Sắp có">
        <div className="grid grid-cols-2 gap-2">
          {placeholderDurations.map((minutes) => (
            <button
              key={minutes}
              type="button"
              aria-pressed={durations.includes(minutes)}
              onClick={() => setDurations(toggle(durations, minutes))}
              className={cn(
                'h-9 rounded-md border bg-card text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                durations.includes(minutes) && 'border-primary bg-accent text-accent-foreground',
              )}
            >
              {minutes} phút
            </button>
          ))}
        </div>
      </Group>

      <Group title="Tình trạng da" note="Sắp có">
        {placeholderSkinConcerns.map((concern, index) => {
          const checkboxId = `${id}-concern-${index}`;
          return (
            <div key={concern} className="flex items-center gap-2.5">
              <Checkbox
                id={checkboxId}
                checked={concerns.includes(concern)}
                onCheckedChange={() => setConcerns(toggle(concerns, concern))}
              />
              <Label htmlFor={checkboxId} className="text-xs font-normal">
                {concern}
              </Label>
            </div>
          );
        })}
      </Group>

      <div className="grid gap-2 border-t pt-4">
        <Button onClick={() => onApply(draft)}>
          <FilterIcon aria-hidden="true" />
          Áp dụng bộ lọc
        </Button>
        <Button
          variant="outline"
          className="bg-card"
          onClick={() => {
            setDurations([]);
            setConcerns([]);
            onReset();
          }}
        >
          Đặt lại mặc định
        </Button>
      </div>
    </div>
  );
}
