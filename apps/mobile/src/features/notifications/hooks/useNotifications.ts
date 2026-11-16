import { useQuery } from '@tanstack/react-query';
import type { NotificationListParams, PagedResponse, NotificationDto } from '@spa/shared-types';
import { callMyNotifications, notificationQueryKeys } from '@/lib/api/notifications';
import { useAuthStore } from '@/stores/authStore';

export function useNotifications(params: NotificationListParams = {}) {
  const status = useAuthStore((s) => s.status);
  const isAuthenticated = status === 'authenticated';

  return useQuery<PagedResponse<NotificationDto>>({
    queryKey: notificationQueryKeys.list(params),
    queryFn: () => callMyNotifications((api) => api.list(params)),
    enabled: isAuthenticated,
  });
}
