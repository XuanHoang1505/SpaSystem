import type { PaginationParams } from './index';

export type NotificationType =
  | 'appointment'
  | 'payment'
  | 'treatment'
  | 'promotion'
  | 'system';

export type NotificationReferenceType =
  | 'appointment'
  | 'order'
  | 'treatment_plan'
  | 'review'
  | 'work_schedule';

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  referenceType?: NotificationReferenceType | null;
  referenceId?: string | null;
  isRead: boolean;
  readAtUtc?: string | null;
  createdAtUtc: string;
}

export interface UnreadNotificationCountDto {
  count: number;
}

export interface NotificationListQuery {
  unreadOnly?: boolean;
  type?: NotificationType;
}

export type NotificationListParams = NotificationListQuery & PaginationParams;
