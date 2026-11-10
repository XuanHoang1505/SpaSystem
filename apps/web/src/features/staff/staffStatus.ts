import type { StatusTone } from '@/components/shared/StatusBadge/StatusBadge';
import type { UserStatus, WorkScheduleStatus } from '@spa/shared-types';

export function staffWorkingBadge(isResigned: boolean): { label: string; tone: StatusTone } {
  return isResigned
    ? { label: 'Đã nghỉ việc', tone: 'danger' }
    : { label: 'Đang làm việc', tone: 'success' };
}

const accountStatusMap: Record<UserStatus, { label: string; tone: StatusTone }> = {
  active: { label: 'Đang hoạt động', tone: 'info' },
  locked: { label: 'Đã khóa', tone: 'danger' },
  inactive: { label: 'Chưa kích hoạt', tone: 'warning' },
};

export function staffAccountBadge(status: UserStatus): { label: string; tone: StatusTone } {
  return accountStatusMap[status] ?? { label: status, tone: 'neutral' };
}

const scheduleStatusMap: Record<WorkScheduleStatus, { label: string; tone: StatusTone }> = {
  active: { label: 'Hoạt động', tone: 'success' },
  cancelled: { label: 'Đã hủy', tone: 'danger' },
};

export function workScheduleStatusBadge(status: WorkScheduleStatus): {
  label: string;
  tone: StatusTone;
} {
  return scheduleStatusMap[status] ?? { label: status, tone: 'neutral' };
}
