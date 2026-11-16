import type {
  NotificationType,
  NotificationDto,
  UserRole,
} from '@spa/shared-types';
import {
  CalendarClockIcon,
  ReceiptTextIcon,
  SparklesIcon,
  TagIcon,
  InfoIcon,
  type LucideIcon,
} from 'lucide-react';
import type { StatusTone } from '@/components/shared/StatusBadge/StatusBadge';

export const notificationTypeLabels: Record<NotificationType, string> = {
  appointment: 'Lịch hẹn',
  payment: 'Thanh toán',
  treatment: 'Liệu trình',
  promotion: 'Khuyến mãi',
  system: 'Hệ thống',
};

export const notificationTypeIcons: Record<NotificationType, LucideIcon> = {
  appointment: CalendarClockIcon,
  payment: ReceiptTextIcon,
  treatment: SparklesIcon,
  promotion: TagIcon,
  system: InfoIcon,
};

export const notificationTypeTones: Record<NotificationType, StatusTone> = {
  appointment: 'info',
  payment: 'success',
  treatment: 'warning',
  promotion: 'neutral',
  system: 'neutral',
};

/**
 * Maps a notification's referenceType and referenceId to the corresponding target route
 * based on the user's role (BR-NTF-07).
 */
export function getNotificationTargetRoute(
  notification: NotificationDto,
  role?: UserRole | null,
): string | null {
  if (!notification.referenceType) return null;

  switch (notification.referenceType) {
    case 'appointment':
      if (role === 'staff') {
        return notification.referenceId
          ? `/staff/bookings/${notification.referenceId}`
          : '/staff/bookings';
      }
      if (role === 'owner') {
        return '/owner/bookings';
      }
      return '/my-bookings';

    case 'order':
      if (role === 'owner') {
        return '/owner/orders';
      }
      return '/my-orders';

    case 'treatment_plan':
      if (role === 'owner') {
        return '/owner/treatments';
      }
      return notification.referenceId
        ? `/my-treatment-plans/${notification.referenceId}`
        : '/my-treatment-plans';

    case 'review':
      if (role === 'owner') {
        return '/owner/reviews';
      }
      return '/my-reviews';

    case 'work_schedule':
      if (role === 'staff') {
        return '/staff/schedule';
      }
      return null;

    default:
      return null;
  }
}
