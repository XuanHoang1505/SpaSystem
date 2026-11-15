import type {
  AllergySeverity,
  AppointmentStatus,
  AssignedAppointmentStatus,
  SkinType,
} from '@spa/shared-types';
import { addDaysToDate, getTodayVnDate } from '@/features/bookings/utils/bookingHelpers';

export const skinTypeLabels: Record<SkinType, string> = {
  normal: 'Da thường',
  dry: 'Da khô',
  oily: 'Da dầu',
  combination: 'Da hỗn hợp',
  sensitive: 'Da nhạy cảm',
};

export const skinTypeOptions: readonly { value: SkinType; label: string }[] = (
  ['normal', 'dry', 'oily', 'combination', 'sensitive'] as const
).map((value) => ({ value, label: skinTypeLabels[value] }));

export const allergySeverityLabels: Record<AllergySeverity, string> = {
  mild: 'Nhẹ',
  moderate: 'Vừa',
  severe: 'Nặng',
};

export const assignedTabs = ['today', 'upcoming', 'done'] as const;
export type AssignedTab = (typeof assignedTabs)[number];

export const assignedTabLabels: Record<AssignedTab, string> = {
  today: 'Hôm nay',
  upcoming: 'Sắp tới',
  done: 'Đã xong',
};

export interface AssignedPreset {
  from: string;
  to: string;
  status: AssignedAppointmentStatus | undefined;
}

export function getAssignedPreset(tab: AssignedTab, today: string = getTodayVnDate()): AssignedPreset {
  switch (tab) {
    case 'upcoming':
      return { from: addDaysToDate(today, 1), to: addDaysToDate(today, 14), status: undefined };
    case 'done':
      return { from: addDaysToDate(today, -30), to: today, status: 'completed' };
    default:
      return { from: today, to: today, status: undefined };
  }
}

export const appointmentStatusMap: Record<
  AppointmentStatus,
  { label: string; tone: 'neutral' | 'success' | 'warning' | 'error' | 'info' }
> = {
  held: { label: 'Tạm giữ', tone: 'neutral' },
  hold_expired: { label: 'Hết hạn giữ', tone: 'neutral' },
  pending_confirmation: { label: 'Chờ xác nhận', tone: 'warning' },
  confirmed: { label: 'Đã xác nhận', tone: 'success' },
  completed: { label: 'Hoàn thành', tone: 'info' },
  cancelled: { label: 'Đã hủy', tone: 'error' },
  no_show: { label: 'Không đến', tone: 'error' },
};

/** Format `yyyy-MM-dd` to `dd/MM/yyyy` */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/** Format ISO UTC date time string to local display string */
export function formatDateTimeUtc(utcString: string | null | undefined): string {
  if (!utcString) return '';
  try {
    const d = new Date(utcString);
    const date = d.toLocaleDateString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const time = d.toLocaleTimeString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${time} ${date}`;
  } catch {
    return utcString;
  }
}
