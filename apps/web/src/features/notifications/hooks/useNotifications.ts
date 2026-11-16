import { useQuery } from '@tanstack/react-query';
import type { NotificationListParams, PagedResponse, NotificationDto } from '@spa/shared-types';
import { callMyNotifications, notificationQueryKeys } from '@/lib/api/notifications';
import { useAuthStore } from '@/stores/authStore';

export function useNotifications(
  params: NotificationListParams & { enabled?: boolean } = {},
) {
  const { enabled = true, ...queryParams } = params;
  const status = useAuthStore((s) => s.status);
  const isAuthenticated = status === 'authenticated';

  return useQuery<PagedResponse<NotificationDto>>({
    queryKey: notificationQueryKeys.list(queryParams),
    queryFn: () => callMyNotifications((api) => api.list(queryParams)),
    enabled: isAuthenticated && enabled,
  });
}
