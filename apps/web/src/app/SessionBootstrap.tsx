import { useEffect } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { restoreSession } from '@/lib/api/session';
import { useAuthStore } from '@/stores/authStore';

/**
 * Restores the session from the refresh cookie once at start-up, and drops cached server data whenever a session
 * ends (docs/specs/auth.md, "Phiên đăng nhập").
 */
export function SessionBootstrap({ client }: { client: QueryClient }) {
  useEffect(() => {
    void restoreSession();
  }, []);

  useEffect(
    () =>
      useAuthStore.subscribe((state, previous) => {
        if (!state.endReason || state.endReason === previous.endReason) return;
        client.clear();
        if (state.endReason === 'expired')
          toast.error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
      }),
    [client],
  );

  return null;
}
