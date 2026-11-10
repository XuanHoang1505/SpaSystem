import type { TreatmentPlanStatus, TreatmentSessionStatus } from '@spa/shared-types';
import type { StatusTone } from '@/components/shared/StatusBadge/StatusBadge';

type Badge = { label: string; tone: StatusTone };

const plans: Record<TreatmentPlanStatus, Badge> = {
  not_started: { label: 'Chưa bắt đầu', tone: 'neutral' },
  in_progress: { label: 'Đang thực hiện', tone: 'success' },
  completed: { label: 'Đã hoàn thành', tone: 'info' },
  paused: { label: 'Tạm dừng', tone: 'warning' },
  cancelled: { label: 'Đã hủy', tone: 'danger' },
};

const sessions: Record<TreatmentSessionStatus, Badge> = {
  not_booked: { label: 'Chưa đặt lịch', tone: 'neutral' },
  booked: { label: 'Đã đặt lịch', tone: 'info' },
  completed: { label: 'Đã hoàn thành', tone: 'success' },
  skipped: { label: 'Đã bỏ qua', tone: 'neutral' },
};

export const treatmentPlanStatusBadge = (status: TreatmentPlanStatus): Badge =>
  plans[status] ?? { label: status, tone: 'neutral' };

export const treatmentSessionStatusBadge = (status: TreatmentSessionStatus): Badge =>
  sessions[status] ?? { label: status, tone: 'neutral' };
