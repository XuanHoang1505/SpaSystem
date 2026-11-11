import type {
  SkinType,
  TreatmentPlanStatus,
  TreatmentSessionStatus,
} from '@spa/shared-types';
import type { StatusTone } from '@/components/shared/StatusBadge/StatusBadge';

export type StatusBadgeTone = StatusTone;

export interface TreatmentBadge {
  label: string;
  tone: StatusBadgeTone;
}

export type TreatmentStatusBadgeResolver<T extends string> = Record<T, TreatmentBadge> & {
  (status: T): TreatmentBadge;
};

function createBadgeResolver<T extends string>(
  mapping: Record<T, TreatmentBadge>,
): TreatmentStatusBadgeResolver<T> {
  const fn = (status: T) => mapping[status] ?? { label: status, tone: 'neutral' };
  return Object.assign(fn, mapping);
}

export const treatmentPlanStatusBadge: TreatmentStatusBadgeResolver<TreatmentPlanStatus> =
  createBadgeResolver<TreatmentPlanStatus>({
    not_started: { label: 'Chưa bắt đầu', tone: 'neutral' },
    in_progress: { label: 'Đang thực hiện', tone: 'success' },
    completed: { label: 'Đã hoàn thành', tone: 'info' },
    paused: { label: 'Tạm dừng', tone: 'warning' },
    cancelled: { label: 'Đã hủy', tone: 'danger' },
  });

export const treatmentSessionStatusBadge: TreatmentStatusBadgeResolver<TreatmentSessionStatus> =
  createBadgeResolver<TreatmentSessionStatus>({
    not_booked: { label: 'Chưa đặt lịch', tone: 'neutral' },
    booked: { label: 'Đã đặt lịch', tone: 'info' },
    completed: { label: 'Đã hoàn thành', tone: 'success' },
    skipped: { label: 'Bỏ qua', tone: 'neutral' },
  });

export const skinTypeLabels: Record<SkinType, string> = {
  Normal: 'Da thường',
  Dry: 'Da khô',
  Oily: 'Da dầu',
  Combination: 'Da hỗn hợp',
  Sensitive: 'Da nhạy cảm',
};
