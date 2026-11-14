import { ApiClientError, errorCodeOf, treatmentErrorCodes } from '@spa/api-client';
import type { MyTreatmentListItem } from '@spa/shared-types';
import {
  formatUtcDateVn,
  getRemainingDaysInfo,
  getTreatmentPlanStatusMeta,
  getTreatmentSessionStatusMeta,
  normalizeVietnameseSearch,
} from '@/features/purchases/utils/purchaseHelpers';

export {
  formatUtcDateVn,
  getRemainingDaysInfo,
  getTreatmentPlanStatusMeta,
  getTreatmentSessionStatusMeta,
  normalizeVietnameseSearch,
};

export function filterTreatmentsByQuery(
  plans: readonly MyTreatmentListItem[],
  query: string,
): MyTreatmentListItem[] {
  const normalized = normalizeVietnameseSearch(query);
  if (!normalized) return [...plans];
  return plans.filter((plan) => {
    const target = normalizeVietnameseSearch(
      `${plan.packageName} ${plan.primaryStaff?.fullName ?? ''}`,
    );
    return target.includes(normalized);
  });
}

export function getTreatmentCannotBookReason(plan: MyTreatmentListItem): string {
  if (plan.status === 'paused') return 'Liệu trình đang tạm dừng';
  if (plan.status === 'cancelled') return 'Liệu trình đã hủy';
  if (plan.status === 'completed') return 'Liệu trình đã hoàn thành';
  if (plan.packageStatus === 'expired') return 'Gói dịch vụ đã hết hạn';
  if (plan.packageStatus === 'cancelled') return 'Gói dịch vụ đã hủy';
  if (plan.bookedSessions + plan.usedSessions >= plan.totalSessions) {
    return 'Các buổi còn lại đều đã được đặt lịch';
  }
  return 'Chưa đủ điều kiện đặt lịch buổi tiếp theo';
}

export interface ClassifiedTreatmentError {
  kind: 'not_found' | 'validation' | 'unauthorized' | 'forbidden' | 'network';
  code?: string;
  message: string;
}

export function classifyTreatmentError(error: unknown): ClassifiedTreatmentError {
  const code = errorCodeOf(error);
  const status = error instanceof ApiClientError ? error.status : 0;
  const fallbackMessage =
    error instanceof Error && error.message
      ? error.message
      : 'Không thể kết nối đến máy chủ. Vui lòng thử lại.';

  if (status === 401) {
    return {
      kind: 'unauthorized',
      code,
      message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    };
  }
  if (status === 403) {
    return {
      kind: 'forbidden',
      code,
      message: 'Tài khoản của bạn không có quyền xem liệu trình này.',
    };
  }
  if (
    code === treatmentErrorCodes.treatmentPlanNotFound ||
    code === treatmentErrorCodes.treatmentSessionNotFound ||
    status === 404
  ) {
    return {
      kind: 'not_found',
      code,
      message: 'Không tìm thấy thông tin phác đồ liệu trình hoặc buổi điều trị.',
    };
  }
  if (code === treatmentErrorCodes.validationError || status === 400) {
    return {
      kind: 'validation',
      code,
      message: fallbackMessage,
    };
  }
  return {
    kind: 'network',
    code,
    message: fallbackMessage,
  };
}
