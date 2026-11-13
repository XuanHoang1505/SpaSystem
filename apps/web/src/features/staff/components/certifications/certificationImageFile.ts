import { ApiClientError, catalogErrorCodes, errorCodeOf } from '@spa/api-client';
import { allowedImageMimeTypes, catalogPolicies } from '@/features/services';
import { reviewErrorMessage } from './reviewErrors';

export const certificationImageAccept = allowedImageMimeTypes.join(',');

/** Same limits as the server (BR-STF-15): JPEG/PNG/WebP up to 5 MB. Returns a message, or null when the file is fine. */
export function checkCertificationImage(file: File): string | null {
  if (!allowedImageMimeTypes.includes(file.type as (typeof allowedImageMimeTypes)[number]))
    return 'Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.';
  if (file.size > catalogPolicies.maxImageSizeBytes) return 'Ảnh tối đa 5 MB.';
  return null;
}

/** Toast text for a failed image upload or removal, chosen by code. */
export function certificationImageErrorMessage(error: unknown): string {
  const code = errorCodeOf(error);
  if (code === catalogErrorCodes.requestTooLarge) return 'Ảnh tối đa 5 MB.';
  if (code === catalogErrorCodes.imageStorageUnavailable)
    return 'Dịch vụ lưu trữ ảnh tạm thời không khả dụng, vui lòng thử lại sau.';
  if (error instanceof ApiClientError && error.status === 400)
    return error.errors[0]?.message || 'Ảnh không hợp lệ.';
  return reviewErrorMessage(error);
}
