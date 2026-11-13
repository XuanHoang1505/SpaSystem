import { useMutation, useQueryClient } from '@tanstack/react-query';
import { File } from 'expo-file-system';
import type { MeDto } from '@spa/shared-types';
import { callUsers, callUsersVoid, usersQueryKeys } from '@/lib/api/users';
import type { AvatarFile } from '../avatarImage';

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    // Expo replaces the global fetch with expo/fetch, which cannot send React Native's `{ uri, name, type }` form
    // part (it fails before any request, read as "no connection"). An expo-file-system File is a Blob with bytes(),
    // name and type, so expo/fetch encodes it as a normal multipart file.
    mutationFn: (file: AvatarFile) => callUsers((api) => api.uploadAvatar(new File(file.uri))),
    onSuccess: (result) => {
      queryClient.setQueryData<MeDto>(usersQueryKeys.me(), (current) =>
        current ? { ...current, avatarUrl: result.avatarUrl } : current,
      );
    },
  });
}

export function useDeleteAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => callUsersVoid((api) => api.deleteAvatar()),
    onSuccess: () => {
      queryClient.setQueryData<MeDto>(usersQueryKeys.me(), (current) =>
        current ? { ...current, avatarUrl: null } : current,
      );
    },
  });
}
