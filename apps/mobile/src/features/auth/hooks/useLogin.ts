import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { LoginRequest } from '@spa/shared-types';
import { callAuth, signIn } from '@/lib/api/session';

/** UC-SPA-02: on success the session is stored (refresh token in the secure store) and old cached data is dropped. */
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: LoginRequest) => callAuth((api) => api.login(values)),
    onSuccess: async (result) => {
      queryClient.clear();
      await signIn(result);
    },
  });
}
