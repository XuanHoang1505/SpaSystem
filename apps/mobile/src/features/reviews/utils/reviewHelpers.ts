import type { ReviewIneligibility } from '@spa/shared-types';

/** Map 1..5 stars to emotion labels for reviews */
export const ratingEmotionLabels: Record<number, string> = {
  1: 'Rất không hài lòng',
  2: 'Chưa hài lòng',
  3: 'Bình thường',
  4: 'Hài lòng',
  5: 'Tuyệt vời, rất hài lòng!',
};

/** Map why a product cannot be reviewed */
export const reviewIneligibilityLabels: Record<ReviewIneligibility, string> = {
  not_used_yet: 'Cần hoàn thành ít nhất 1 buổi để đánh giá',
  not_enough_sessions: 'Gói cần hoàn thành số buổi tối thiểu',
  already_reviewed: 'Đã gửi đánh giá',
};

/** Format review date dd/MM/yyyy */
export function formatReviewDate(isoDateStr: string): string {
  try {
    const date = new Date(isoDateStr);
    if (isNaN(date.getTime())) return isoDateStr;
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  } catch {
    return isoDateStr;
  }
}

/** Format rating average to 1 decimal place, or null if null/0 */
export function formatRatingAverage(avg: number | null | undefined): string | null {
  if (avg === null || avg === undefined) return null;
  return Number(avg).toFixed(1);
}
