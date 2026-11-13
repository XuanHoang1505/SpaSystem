import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MeDto, UpdateProfileRequest } from '@spa/shared-types';
import { callUsers, usersQueryKeys } from '@/lib/api/users';
import { useAuthStore } from '@/stores/authStore';

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProfileRequest) => callUsers((api) => api.updateMe(body)),
    onSuccess: (me: MeDto) => {
      queryClient.setQueryData(usersQueryKeys.me(), me);
      void queryClient.invalidateQueries({ queryKey: usersQueryKeys.me() });
      useAuthStore.setState((state) =>
        state.user ? { user: { ...state.user, fullName: me.fullName } } : {},
      );
    },
  });
}
