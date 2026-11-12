import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { restoreSession } from '@/lib/api/session';
import { useAuthStore } from '@/stores/authStore';

/** Restores the stored session once at start-up and drops cached server data whenever the signed-in user changes. */
export function SessionBootstrap() {
  const queryClient = useQueryClient();

  useEffect(() => {
    void restoreSession();
  }, []);

  useEffect(
    () =>
      useAuthStore.subscribe((state, previous) => {
        if (state.user?.id !== previous.user?.id) queryClient.clear();
      }),
    [queryClient],
  );

  return null;
}
