import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { callAuthVoid } from './callAuth';

/**
 * UC-SPA-02 A3. The API revokes the cookie's token and clears the cookie; whatever it answers, the local session
 * ends (SessionBootstrap then drops cached data). The guard of the page being left sends the user home while
 * `endReason` is 'logout'; useSettleLogout clears it once a public page is shown.
 */
export function useLogout() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => callAuthVoid((api) => api.logout()),
    onSettled: () => {
      useAuthStore.getState().endSession('logout');
      void navigate('/', { replace: true });
      toast.success('Đã đăng xuất.');
    },
  });
}
