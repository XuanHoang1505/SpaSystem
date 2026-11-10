import type { AppointmentStatus } from '@spa/shared-types';
import type { StatusTone } from '@/components/shared/StatusBadge/StatusBadge';

const labels: Record<AppointmentStatus, { label: string; tone: StatusTone }> = {
  held: { label: 'Giữ chỗ', tone: 'warning' },
  pending_confirmation: { label: 'Chờ xác nhận', tone: 'info' },
  confirmed: { label: 'Đã xác nhận', tone: 'success' },
  completed: { label: 'Hoàn thành', tone: 'success' },
  cancelled: { label: 'Đã hủy', tone: 'neutral' },
  no_show: { label: 'Vắng mặt', tone: 'danger' },
  hold_expired: { label: 'Hết hạn giữ chỗ', tone: 'neutral' },
};

export const appointmentStatusBadge = (status: AppointmentStatus) => labels[status];
