export const allowedReviewImageMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const maxReviewImageBytes = 5 * 1024 * 1024; // 5 MB

export const reviewImageAccept = 'image/jpeg,image/png,image/webp';

export function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/**
 * Validates a user-picked photo for a review (JPEG, PNG, WebP up to 5 MB).
 * Returns an error string if invalid, or null if the file passes validation.
 */
export function checkReviewImage(file: File): string | null {
  if (!allowedReviewImageMimeTypes.includes(file.type as (typeof allowedReviewImageMimeTypes)[number])) {
    return 'Định dạng ảnh không được hỗ trợ. Vui lòng chọn file JPEG, PNG hoặc WebP.';
  }
  if (file.size > maxReviewImageBytes) {
    return 'Dung lượng ảnh vượt quá 5 MB. Vui lòng chọn ảnh có kích thước nhỏ hơn.';
  }
  return null;
}
