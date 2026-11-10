import type { AppointmentStatus } from '@spa/shared-types';
import type { StatusTone } from '@/components/shared/StatusBadge/StatusBadge';

type Badge = { label: string; tone: StatusTone };

const statuses: Record<string, Badge> = {
  completed: { label: 'Đã hoàn thành', tone: 'success' },
  no_show: { label: 'Vắng mặt', tone: 'danger' },
};

export const serviceHistoryStatusBadge = (status: AppointmentStatus): Badge =>
  statuses[status] ?? { label: status, tone: 'neutral' };
