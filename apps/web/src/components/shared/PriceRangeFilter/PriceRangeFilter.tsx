import { useState, type KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/shared/FormField/FormField';
import { cn } from '@/lib/utils';

export interface PriceRange {
  min?: number;
  max?: number;
}

const INVALID = 'Nhập số tiền hợp lệ';
const ORDER = 'Giá đến phải lớn hơn hoặc bằng giá từ';

/** '' → undefined; số nguyên ≥ 0 → số; còn lại → null (không hợp lệ). */
function parseAmount(value: string): number | undefined | null {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

/** Hai ô "Từ" / "Đến" (đ), áp dụng khi rời ô hoặc Enter; không gọi `onApply` khi khoảng sai. */
export function PriceRangeFilter({
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
  const [from, setFrom] = useState(min?.toString() ?? '');
  const [to, setTo] = useState(max?.toString() ?? '');
  const [errors, setErrors] = useState<{ from?: string; to?: string }>({});
  const [synced, setSynced] = useState({ min, max });

  // Bộ lọc đổi từ bên ngoài (Xóa bộ lọc, back/forward): đồng bộ lại ô nhập.
  if (synced.min !== min || synced.max !== max) {
    setSynced({ min, max });
    setFrom(min?.toString() ?? '');
    setTo(max?.toString() ?? '');
    setErrors({});
  }

  function apply() {
    const nextMin = parseAmount(from);
    const nextMax = parseAmount(to);
    const fromError = nextMin === null ? INVALID : undefined;
    const toError =
      nextMax === null
        ? INVALID
        : nextMin != null && nextMax !== undefined && nextMin > nextMax
          ? ORDER
          : undefined;
    setErrors({ from: fromError, to: toError });
    if (fromError || toError || nextMin === null || nextMax === null) return;
    if (nextMin === min && nextMax === max) return;
    onApply({ min: nextMin, max: nextMax });
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    apply();
  };

  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      <FormField label="Từ" error={errors.from}>
        <Input
          id={`${idPrefix}-min-price`}
          inputMode="numeric"
          placeholder="0 đ"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          onBlur={apply}
          onKeyDown={onKeyDown}
        />
      </FormField>
      <FormField label="Đến" error={errors.to}>
        <Input
          id={`${idPrefix}-max-price`}
          inputMode="numeric"
          placeholder="Không giới hạn"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          onBlur={apply}
          onKeyDown={onKeyDown}
        />
      </FormField>
    </div>
  );
}
