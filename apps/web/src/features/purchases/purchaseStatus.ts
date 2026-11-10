import type {
  CustomerPackageStatus,
  EntitlementStatus,
  TreatmentSessionStatus,
} from '@spa/shared-types';
import type { StatusTone } from '@/components/shared/StatusBadge/StatusBadge';

type Badge = { label: string; tone: StatusTone };

const entitlements: Record<EntitlementStatus, Badge> = {
  available: { label: 'Còn hiệu lực', tone: 'success' },
  booked: { label: 'Đã đặt lịch', tone: 'info' },
  used: { label: 'Đã sử dụng', tone: 'neutral' },
  expired: { label: 'Hết hạn', tone: 'neutral' },
};

const packages: Record<CustomerPackageStatus, Badge> = {
  active: { label: 'Đang dùng', tone: 'success' },
  completed: { label: 'Hoàn thành', tone: 'info' },
  expired: { label: 'Hết hạn', tone: 'neutral' },
  cancelled: { label: 'Đã hủy', tone: 'danger' },
};

const sessions: Record<TreatmentSessionStatus, Badge> = {
  not_booked: { label: 'Chưa đặt lịch', tone: 'neutral' },
  booked: { label: 'Đã đặt lịch', tone: 'info' },
  completed: { label: 'Đã hoàn thành', tone: 'success' },
  skipped: { label: 'Đã bỏ qua', tone: 'neutral' },
};

/** Trạng thái hiệu lực do API tính (BR-TRT-04); FE không tự đổi theo hạn. */
export const entitlementStatusBadge = (status: EntitlementStatus) => entitlements[status];
export const packageStatusBadge = (status: CustomerPackageStatus) => packages[status];
export const sessionStatusBadge = (status: TreatmentSessionStatus) => sessions[status];
