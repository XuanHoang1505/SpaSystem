import { useQuery } from '@tanstack/react-query';
import type { UnreadNotificationCountDto } from '@spa/shared-types';
import { callMyNotifications, notificationQueryKeys } from '@/lib/api/notifications';
import { useAuthStore } from '@/stores/authStore';

export function useUnreadNotificationCount() {
  const status = useAuthStore((s) => s.status);
  const isAuthenticated = status === 'authenticated';
  const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

  return useQuery<UnreadNotificationCountDto>({
    queryKey: notificationQueryKeys.unreadCount(),
    queryFn: () => callMyNotifications((api) => api.getUnreadCount()),
    enabled: isAuthenticated && !isTest,
    initialData: isTest ? { count: 0 } : undefined,
    staleTime: 30_000,
  });
}
