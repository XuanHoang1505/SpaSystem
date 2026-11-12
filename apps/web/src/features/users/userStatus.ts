import type { Gender, UserStatus } from '@spa/shared-types';
import type { StatusTone } from '@/components/shared/StatusBadge/StatusBadge';

const statusBadges: Record<UserStatus, { label: string; tone: StatusTone }> = {
  active: { label: 'Đang hoạt động', tone: 'success' },
  locked: { label: 'Đã khóa', tone: 'danger' },
  inactive: { label: 'Ngừng hoạt động', tone: 'neutral' },
};

export const userStatusBadge = (status: UserStatus) => statusBadges[status];

/** The three account statuses, in the order of the status filter. */
export const userStatuses: readonly UserStatus[] = ['active', 'locked', 'inactive'];

export const isUserStatus = (value: string): value is UserStatus =>
  (userStatuses as readonly string[]).includes(value);

export const genderLabels: Record<Gender, string> = {
  male: 'Nam',
  female: 'Nữ',
  other: 'Khác',
};
