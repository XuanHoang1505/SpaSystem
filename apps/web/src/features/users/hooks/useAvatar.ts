import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersQueryKeys } from '@spa/api-client';
import type { AvatarUrlDto, MeDto } from '@spa/shared-types';
import { callUsers, callUsersVoid } from '@/lib/api/users';

export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File | Blob) =>
      callUsers((api) => api.uploadAvatar(file)),
    onSuccess: (result: AvatarUrlDto) => {
      queryClient.setQueryData<MeDto>(usersQueryKeys.me(), (old) =>
        old ? { ...old, avatarUrl: result.avatarUrl } : old,
      );
      queryClient.invalidateQueries({ queryKey: usersQueryKeys.me() });
    },
  });
}

export function useDeleteAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => callUsersVoid((api) => api.deleteAvatar()),
    onSuccess: () => {
      queryClient.setQueryData<MeDto>(usersQueryKeys.me(), (old) =>
        old ? { ...old, avatarUrl: null } : old,
      );
      queryClient.invalidateQueries({ queryKey: usersQueryKeys.me() });
    },
  });
}
