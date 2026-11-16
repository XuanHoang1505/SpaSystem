import type { ComponentType } from 'react';
import type {
  NotificationType,
  NotificationDto,
  UserRole,
} from '@spa/shared-types';
import {
  CalendarCheck,
  Receipt,
  Sparkles,
  Tag,
  Info,
} from 'lucide-react-native';
import { colors } from '@theme/index';

export const mobileNotificationTypeLabels: Record<NotificationType, string> = {
  appointment: 'Lịch hẹn',
  payment: 'Thanh toán',
  treatment: 'Liệu trình',
  promotion: 'Khuyến mãi',
  system: 'Hệ thống',
};

export const mobileNotificationTypeIcons: Record<
  NotificationType,
  ComponentType<{ size?: number; color?: string }>
> = {
  appointment: CalendarCheck,
  payment: Receipt,
  treatment: Sparkles,
  promotion: Tag,
  system: Info,
};

export const mobileNotificationTypeColors: Record<NotificationType, { bg: string; icon: string }> = {
  appointment: { bg: colors.infoSoft, icon: colors.info },
  payment: { bg: colors.successSoft, icon: colors.success },
  treatment: { bg: colors.warningSoft, icon: colors.accentGoldText },
  promotion: { bg: colors.accentRoseSoft, icon: colors.accentRoseText },
  system: { bg: colors.primarySoft, icon: colors.primary },
};

/**
 * Maps notification reference to mobile screen route.
 */
export function getMobileNotificationTargetRoute(
  notification: NotificationDto,
  role?: UserRole | null,
): string | null {
  if (!notification.referenceType) return null;

  switch (notification.referenceType) {
    case 'appointment':
      if (role === 'staff') {
        return '/(staff)/bookings';
      }
      return '/(customer)/bookings';

    case 'order':
      return '/my-orders';

    case 'treatment_plan':
      return '/(customer)/treatments';

    case 'review':
      return '/my-reviews';

    case 'work_schedule':
      if (role === 'staff') {
        return '/(staff)/schedule';
      }
      return null;

    default:
      return null;
  }
}

export function formatRelativeTime(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}
