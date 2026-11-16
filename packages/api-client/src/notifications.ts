import type {
  ApiResponse,
  PagedResponse,
  NotificationDto,
  UnreadNotificationCountDto,
  NotificationListParams,
} from '@spa/shared-types';
import type { ApiClient, RequestOptions } from './index';

export const notificationErrorCodes = {
  notFound: 'notification_not_found',
  unauthorized: 'unauthorized',
} as const;

export const notificationQueryKeys = {
  all: ['notifications'] as const,
  list: (params: NotificationListParams = {}) =>
    ['notifications', 'list', params] as const,
  detail: (id: string) => ['notifications', 'detail', id] as const,
  unreadCount: () => ['notifications', 'unread-count'] as const,
};

export class MyNotificationsApi {
  constructor(private readonly client: ApiClient) {}

  list(
    params: NotificationListParams = {},
    options?: RequestOptions,
  ): Promise<ApiResponse<PagedResponse<NotificationDto>>> {
    return this.client.get<ApiResponse<PagedResponse<NotificationDto>>>(
      '/api/v1/me/notifications',
      {
        query: { ...params },
        ...options,
      },
    );
  }

  open(id: string, options?: RequestOptions): Promise<ApiResponse<NotificationDto>> {
    return this.client.get<ApiResponse<NotificationDto>>(
      `/api/v1/me/notifications/${encodeURIComponent(id)}`,
      options,
    );
  }

  markRead(id: string, options?: RequestOptions): Promise<void> {
    return this.client.post<undefined, void>(
      `/api/v1/me/notifications/${encodeURIComponent(id)}/read`,
      undefined,
      options,
    );
  }

  markAllRead(options?: RequestOptions): Promise<void> {
    return this.client.post<undefined, void>(
      '/api/v1/me/notifications/read-all',
      undefined,
      options,
    );
  }

  getUnreadCount(
    options?: RequestOptions,
  ): Promise<ApiResponse<UnreadNotificationCountDto>> {
    return this.client.get<ApiResponse<UnreadNotificationCountDto>>(
      '/api/v1/me/notifications/unread-count',
      options,
    );
  }
}
