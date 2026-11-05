import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { LoginRequest } from '@spa/shared-types';
import { useAuthStore } from '@/stores/authStore';
import { callAuth } from './callAuth';

/** UC-SPA-02: on success the session is stored and cached data of any previous user is dropped. */
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: LoginRequest) => callAuth((api) => api.login(values)),
    onSuccess: (result) => {
      queryClient.clear();
      useAuthStore.getState().setSession(result);
    },
  });
}
