import { useMutation, useQueryClient } from '@tanstack/react-query';
import { callMyNotificationsVoid, notificationQueryKeys } from '@/lib/api/notifications';

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
    },
  });

  return {
    markRead: markReadMutation.mutate,
    markReadAsync: markReadMutation.mutateAsync,
    isMarkingRead: markReadMutation.isPending,
    markAllRead: markAllReadMutation.mutate,
    markAllReadAsync: markAllReadMutation.mutateAsync,
    isMarkingAllRead: markAllReadMutation.isPending,
  };
}
