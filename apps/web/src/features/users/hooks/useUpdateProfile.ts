import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersQueryKeys } from '@spa/api-client';
import type { MeDto, UpdateProfileRequest } from '@spa/shared-types';
import { callUsers } from '@/lib/api/users';
import { useAuthStore } from '@/stores/authStore';

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfileRequest) =>
      callUsers((api) => api.updateMe(data)),
    onSuccess: (updated: MeDto) => {
      queryClient.setQueryData(usersQueryKeys.me(), updated);
      queryClient.invalidateQueries({ queryKey: usersQueryKeys.me() });
      useAuthStore.setState((state) =>
        state.user ? { user: { ...state.user, fullName: updated.fullName } } : {},
      );
    },
  });
}
