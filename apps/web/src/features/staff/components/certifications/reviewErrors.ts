import { ApiClientError, errorCodeOf, staffCertificationErrorCodes } from '@spa/api-client';

/** Toast text for a failed certification write or review, chosen by code (never by message). */
export function reviewErrorMessage(error: unknown): string {
  const code = errorCodeOf(error);
  if (code === staffCertificationErrorCodes.notFound)
    return 'Không tìm thấy bằng này, danh sách đã được tải lại.';
  if (
    code === staffCertificationErrorCodes.limit ||
    code === staffCertificationErrorCodes.statusInvalid ||
    code === staffCertificationErrorCodes.verified
  )
    return (
      (error instanceof ApiClientError && error.errors[0]?.message) ||
      'Không thực hiện được thao tác.'
    );
  return 'Đã có lỗi xảy ra, vui lòng thử lại.';
}
