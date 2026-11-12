import { useMutation } from '@tanstack/react-query';
import type { ChangePasswordRequest } from '@spa/shared-types';
import { callUsersVoid } from '@/lib/api/users';

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordRequest) => callUsersVoid((api) => api.changePassword(data)),
  });
}
