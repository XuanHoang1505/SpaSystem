import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AuthResult, LoginRequest } from '@spa/shared-types';
import { getAuthApi } from '@/lib/api/session';
import { useAuthStore } from '@/stores/authStore';

/** UC-SPA-02: on success the session is stored and cached data of any previous user is dropped. */
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: LoginRequest): Promise<AuthResult> => {
      const { api, error } = getAuthApi();
      if (!api) throw new Error(error);
      const response = await api.login(values);
      if (!response.data) throw new Error('Empty login response.');
      return response.data;
    },
    onSuccess: (result) => {
      queryClient.clear();
      useAuthStore.getState().setSession(result);
    },
  });
}
