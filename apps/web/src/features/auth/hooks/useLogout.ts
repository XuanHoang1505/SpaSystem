import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { callAuthVoid } from './callAuth';

/**
 * UC-SPA-02 A3. The API revokes the cookie's token and clears the cookie; whatever it answers, the local session
 * ends (SessionBootstrap then drops cached data). Leaves for "/" first so no guard bounces to /login.
 */
export function useLogout() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => callAuthVoid((api) => api.logout()),
    onSettled: () => {
      navigate('/', { replace: true });
      useAuthStore.getState().endSession('logout');
      toast.success('Đã đăng xuất.');
    },
  });
}
