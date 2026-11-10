import type { AllergySeverity, AppointmentStatus } from '@spa/shared-types';
import type { StatusTone } from '@/components/shared/StatusBadge/StatusBadge';

const labels: Record<AppointmentStatus, { label: string; tone: StatusTone }> = {
  held: { label: 'Giữ chỗ', tone: 'warning' },
  pending_confirmation: { label: 'Chờ xác nhận', tone: 'info' },
  confirmed: { label: 'Đã xác nhận', tone: 'success' },
  completed: { label: 'Hoàn thành', tone: 'success' },
  cancelled: { label: 'Đã hủy', tone: 'neutral' },
  no_show: { label: 'Không đến', tone: 'danger' },
  hold_expired: { label: 'Hết hạn giữ chỗ', tone: 'neutral' },
};

export const appointmentStatusBadge = (status: AppointmentStatus) => labels[status];

/** The seven statuses, in the order of the union (owner status filter). */
export const appointmentStatuses: readonly AppointmentStatus[] = [
  'held',
  'pending_confirmation',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
  'hold_expired',
];

export const isAppointmentStatus = (value: string): value is AppointmentStatus =>
  (appointmentStatuses as readonly string[]).includes(value);

/** The five owner commands of UC-SPA-17. */
export type OwnerAppointmentAction =
  'confirm' | 'reschedule' | 'assign_staff' | 'cancel' | 'no_show';

const ownerActions: Record<AppointmentStatus, readonly OwnerAppointmentAction[]> = {
  held: [],
  pending_confirmation: ['confirm', 'reschedule', 'assign_staff', 'cancel'],
  confirmed: ['reschedule', 'assign_staff', 'cancel', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
  hold_expired: [],
};

/**
 * Owner commands shown for a status (the state table of docs/specs/bookings.md). Time conditions are the backend's:
 * it answers `appointment_in_past` or `no_show_too_early`.
 */
export const ownerAppointmentActions = (status: AppointmentStatus) => ownerActions[status];

export const ownerActionLabels: Record<OwnerAppointmentAction, string> = {
  confirm: 'Xác nhận',
  reschedule: 'Đổi giờ',
  assign_staff: 'Đổi nhân viên',
  cancel: 'Hủy lịch',
  no_show: 'Khách không đến',
};

const allergyLabels: Record<AllergySeverity, { label: string; tone: StatusTone }> = {
  mild: { label: 'Nhẹ', tone: 'neutral' },
  moderate: { label: 'Vừa', tone: 'warning' },
  severe: { label: 'Nặng', tone: 'danger' },
};

export const allergySeverityBadge = (severity: AllergySeverity) => allergyLabels[severity];
