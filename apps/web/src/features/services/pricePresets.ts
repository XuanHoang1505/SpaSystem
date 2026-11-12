import type { PriceRange } from '@/components/shared/PriceRangeFilter/PriceRangeFilter';

/** Mốc giá của bộ lọc dịch vụ (SCR-W02, mẫu Stitch); gửi lên API thành `minPrice`/`maxPrice`. */
export const servicePricePresets: readonly { id: string; label: string; range: PriceRange }[] = [
  { id: 'under-500k', label: 'Dưới 500.000 đ', range: { max: 500000 } },
  { id: '500k-1m', label: '500.000 đ – 1.000.000 đ', range: { min: 500000, max: 1000000 } },
  { id: '1m-2m', label: '1.000.000 đ – 2.000.000 đ', range: { min: 1000000, max: 2000000 } },
  { id: 'over-2m', label: 'Trên 2.000.000 đ', range: { min: 2000000 } },
];

/** Mốc khớp đúng khoảng giá hiện tại, hoặc undefined (không lọc giá, hoặc khoảng tự nhập). */
export const presetOf = (min: number | undefined, max: number | undefined) =>
  servicePricePresets.find((preset) => preset.range.min === min && preset.range.max === max);
