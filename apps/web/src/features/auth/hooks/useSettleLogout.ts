import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

/**
 * Called by PublicLayout. While `endReason` is 'logout' the guard of the page being left sends the user home; once a
 * public page is on screen that guard is gone, so the reason is cleared and later guarded links ask to log in again.
 * Clearing it earlier (e.g. right after navigate) races React Router's transition and the old guard redirects to /login.
 */
export function useSettleLogout() {
  const endReason = useAuthStore((state) => state.endReason);
  useEffect(() => {
    if (endReason === 'logout') useAuthStore.setState({ endReason: null });
  }, [endReason]);
}
