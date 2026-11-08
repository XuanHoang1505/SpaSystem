import type { PackageItem } from '@spa/shared-types';

/**
 * Số ngày tối thiểu từ buổi đầu tới buổi cuối của gói: mỗi buổi (trừ buổi đầu tiên) phải cách buổi trước ít nhất
 * `minDaysBetweenSessions` của dịch vụ đó (BR-BKG-05). Thứ tự buổi theo `items` (đã sắp theo `sortOrder`).
 */
export function minCourseDays(items: readonly PackageItem[]): number {
  let days = 0;
  let first = true;
  for (const item of items)
    for (let session = 0; session < item.sessionCount; session += 1) {
      if (!first) days += item.minDaysBetweenSessions;
      first = false;
    }
  return days;
}

/** Phần trăm tiết kiệm so với mua lẻ (làm tròn), hoặc 0 khi gói không rẻ hơn. */
export function savingPercent(price: number, retailPrice: number): number {
  if (retailPrice <= 0 || price >= retailPrice) return 0;
  return Math.round((1 - price / retailPrice) * 100);
}
