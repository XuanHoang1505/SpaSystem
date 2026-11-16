import { useMutation, useQueryClient } from '@tanstack/react-query';
import { callMyNotifications, callMyNotificationsVoid, notificationQueryKeys } from '@/lib/api/notifications';
import { toast } from 'sonner';

export function useNotificationMutations() {
  const queryClient = useQueryClient();

  const markReadMutation = useMutation({
    mutationFn: (id: string) => callMyNotificationsVoid((api) => api.markRead(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => callMyNotificationsVoid((api) => api.markAllRead()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
      toast.success('Đã đánh dấu tất cả thông báo là đã đọc');
    },
    onError: () => {
      toast.error('Không thể đánh dấu đã đọc. Vui lòng thử lại sau.');
    },
  });

  const openMutation = useMutation({
    mutationFn: (id: string) => callMyNotifications((api) => api.open(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
    },
  });

  return {
    markRead: markReadMutation.mutate,
    markReadAsync: markReadMutation.mutateAsync,
    isMarkingRead: markReadMutation.isPending,
    markAllRead: markAllReadMutation.mutate,
    markAllReadAsync: markAllReadMutation.mutateAsync,
    isMarkingAllRead: markAllReadMutation.isPending,
    open: openMutation.mutate,
    openAsync: openMutation.mutateAsync,
    isOpening: openMutation.isPending,
  };
}
